"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRedisPing = checkRedisPing;
exports.inspectRedisCacheState = inspectRedisCacheState;
const redis_1 = require("redis");
const useMemoryFallback = process.env.CACHE_HANDLER_FALLBACK === "memory";
let client = null;
let connectPromise = null;
const memoryEntries = new Map();
const memoryTagEntries = new Map();
const memoryTagExpirations = new Map();
function getRedisUrl() {
    return process.env.REDIS_URL || null;
}
function getClient() {
    if (useMemoryFallback) {
        return null;
    }
    const redisUrl = getRedisUrl();
    if (!redisUrl) {
        return null;
    }
    if (client) {
        return client;
    }
    client = (0, redis_1.createClient)({
        url: redisUrl,
        socket: {
            connectTimeout: 1000,
            reconnectStrategy: false,
        },
    });
    client.on("error", (err) => {
        console.error("[Redis CacheHandler] Redis client error:", err.message);
    });
    return client;
}
async function connectClient() {
    const redisClient = getClient();
    if (!redisClient) {
        return null;
    }
    if (redisClient.isOpen) {
        return redisClient;
    }
    if (!connectPromise) {
        connectPromise = redisClient
            .connect()
            .then(() => undefined)
            .finally(() => {
            connectPromise = null;
        });
    }
    try {
        await connectPromise;
        return redisClient;
    }
    catch (err) {
        console.error("[Redis CacheHandler] Failed to connect:", err.message);
        return null;
    }
}
// ─── Key Helpers ──────────────────────────────────────────────────────────────
const TAG_KEY_PREFIX = "next-cache:tag:";
const TAG_EXPIRATION_PREFIX = "next-cache:tag-expiration:";
const ENTRY_KEY_PREFIX = "next-cache:entry:";
function entryKey(cacheKey) {
    return `${ENTRY_KEY_PREFIX}${cacheKey}`;
}
function tagKey(tag) {
    return `${TAG_KEY_PREFIX}${tag}`;
}
function tagExpirationKey(tag) {
    return `${TAG_EXPIRATION_PREFIX}${tag}`;
}
function getMemoryTagSet(tag) {
    const existing = memoryTagEntries.get(tag);
    if (existing)
        return existing;
    const created = new Set();
    memoryTagEntries.set(tag, created);
    return created;
}
// ─── Health Check Helper (used by /api/health) ────────────────────────────────
async function checkRedisPing() {
    const start = Date.now();
    if (useMemoryFallback) {
        return { ok: true, latencyMs: 0 };
    }
    try {
        const redisClient = await connectClient();
        if (!redisClient) {
            return { ok: false, latencyMs: Date.now() - start };
        }
        await redisClient.ping();
        return { ok: true, latencyMs: Date.now() - start };
    }
    catch {
        return { ok: false, latencyMs: Date.now() - start };
    }
}
async function inspectRedisCacheState() {
    if (useMemoryFallback) {
        return {
            entryKeys: [...memoryEntries.keys()],
            tagKeys: [...memoryTagEntries.keys()].map((tag) => tagKey(tag)),
            tagExpirationKeys: [...memoryTagExpirations.keys()].map((tag) => tagExpirationKey(tag)),
        };
    }
    const redisClient = await connectClient();
    if (!redisClient) {
        return {
            entryKeys: [],
            tagKeys: [],
            tagExpirationKeys: [],
        };
    }
    const [entryKeys, tagKeys, tagExpirationKeys] = await Promise.all([
        redisClient.keys(`${ENTRY_KEY_PREFIX}*`),
        redisClient.keys(`${TAG_KEY_PREFIX}*`),
        redisClient.keys(`${TAG_EXPIRATION_PREFIX}*`),
    ]);
    return {
        entryKeys,
        tagKeys,
        tagExpirationKeys,
    };
}
// ─── CacheHandler ─────────────────────────────────────────────────────────────
module.exports = {
    async get(cacheKey, softTags) {
        void softTags;
        const redisClient = await connectClient();
        const redisKey = entryKey(cacheKey);
        try {
            const stored = redisClient
                ? await redisClient.get(redisKey)
                : memoryEntries.get(redisKey);
            if (!stored)
                return undefined;
            const data = JSON.parse(stored);
            // revalidate 시간이 지났으면 삭제 후 cache miss 처리
            const now = Date.now();
            if (now > data.timestamp + data.revalidate * 1000) {
                if (redisClient) {
                    await redisClient.del(redisKey).catch(() => { });
                }
                else {
                    memoryEntries.delete(redisKey);
                }
                return undefined;
            }
            // base64로 저장된 바이트를 ReadableStream으로 복원
            return {
                value: new ReadableStream({
                    start(controller) {
                        controller.enqueue(Buffer.from(data.value, "base64"));
                        controller.close();
                    },
                }),
                tags: data.tags,
                stale: data.stale,
                timestamp: data.timestamp,
                expire: data.expire,
                revalidate: data.revalidate,
            };
        }
        catch (err) {
            console.error("[Redis CacheHandler] get() error:", err.message);
            return undefined; // cache miss로 처리 (앱 크래시 방지)
        }
    },
    async set(cacheKey, pendingEntry) {
        try {
            const redisClient = await connectClient();
            const entry = await pendingEntry;
            // ReadableStream을 Buffer로 읽기
            const reader = entry.value.getReader();
            const chunks = [];
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    chunks.push(value);
                }
            }
            finally {
                reader.releaseLock();
            }
            const buffer = Buffer.concat(chunks);
            const redisKey = entryKey(cacheKey);
            // expire: 0 버그 수정 - 0이면 revalidate로 폴백, 그것도 없으면 1시간
            const ttl = entry.expire > 0
                ? entry.expire
                : entry.revalidate > 0
                    ? entry.revalidate
                    : 3600;
            const serialized = JSON.stringify({
                value: buffer.toString("base64"),
                tags: entry.tags,
                stale: entry.stale,
                timestamp: entry.timestamp,
                expire: entry.expire,
                revalidate: entry.revalidate,
            });
            if (redisClient) {
                await redisClient.set(redisKey, serialized, { EX: ttl });
            }
            else {
                memoryEntries.set(redisKey, serialized);
            }
            // 태그 인덱스 업데이트: tag → [entryKey, ...] (Set)
            if (Array.isArray(entry.tags)) {
                for (const tag of entry.tags) {
                    if (!tag)
                        continue;
                    const tKey = tagKey(tag);
                    if (redisClient) {
                        await redisClient.sAdd(tKey, redisKey);
                        await redisClient.expire(tKey, ttl);
                    }
                    else {
                        getMemoryTagSet(tag).add(redisKey);
                    }
                }
            }
        }
        catch (err) {
            // set 실패는 best-effort — 로그만 남기고 무시
            console.error("[Redis CacheHandler] set() error:", err.message);
        }
    },
    async refreshTags() {
        // Redis를 single source of truth로 사용하므로 no-op
    },
    async getExpiration(tags) {
        if (!Array.isArray(tags) || tags.length === 0)
            return 0;
        const redisClient = await connectClient();
        if (!redisClient) {
            return Math.max(0, ...tags.map((tag) => memoryTagExpirations.get(tag) || 0));
        }
        const expirationKeys = tags.map(tagExpirationKey);
        const values = await redisClient.mGet(expirationKeys);
        let maxExpiration = 0;
        for (const value of values) {
            if (!value)
                continue;
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed) && parsed > maxExpiration) {
                maxExpiration = parsed;
            }
        }
        return maxExpiration;
    },
    async updateTags(tags, durations) {
        if (!Array.isArray(tags) || tags.length === 0)
            return;
        const redisClient = await connectClient();
        try {
            const now = Date.now();
            const isHardExpire = durations?.expire === 0;
            for (const tag of tags) {
                const expirationMarkerKey = tagExpirationKey(tag);
                if (redisClient) {
                    await redisClient.set(expirationMarkerKey, String(now));
                }
                else {
                    memoryTagExpirations.set(tag, now);
                }
                if (!isHardExpire) {
                    // soft stale은 태그 만료 시각만 올려서 stale-while-revalidate 경로를 탄다.
                    continue;
                }
                const tKey = tagKey(tag);
                const entryKeys = redisClient
                    ? await redisClient.sMembers(tKey)
                    : [...(memoryTagEntries.get(tag) || new Set())];
                if (entryKeys.length > 0 && redisClient) {
                    await redisClient.del(entryKeys);
                }
                if (redisClient) {
                    await redisClient.del(tKey);
                }
                else {
                    for (const key of entryKeys) {
                        memoryEntries.delete(key);
                    }
                    memoryTagEntries.delete(tag);
                }
            }
        }
        catch (err) {
            // 무효화 실패는 치명적 — 상위로 전파
            console.error("[Redis CacheHandler] updateTags() error:", err.message);
            throw err;
        }
    },
};
