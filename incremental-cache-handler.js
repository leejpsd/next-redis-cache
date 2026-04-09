/* eslint-disable @typescript-eslint/no-require-imports */

const { createClient } = require("redis");
const {
  NEXT_CACHE_TAGS_HEADER,
  CACHE_ONE_YEAR_SECONDS,
  INFINITE_CACHE,
} = require("next/dist/lib/constants");
const {
  CachedRouteKind,
  IncrementalCacheKind,
} = require("next/dist/server/response-cache");

const ENTRY_KEY_PREFIX = "next-incremental:entry:";
const TAG_META_PREFIX = "next-incremental:tag:";
const INSTANCE_LOCAL_TAG_PREFIX = "instance-local:";

const useMemoryFallback = process.env.CACHE_HANDLER_FALLBACK === "memory";
let redisClient = null;
let connectPromise = null;
const memoryEntries = new Map();
const memoryTagStates = new Map();

function entryKey(key) {
  return `${ENTRY_KEY_PREFIX}${key}`;
}

function tagMetaKey(tag) {
  return `${TAG_META_PREFIX}${tag}`;
}

function getRedisUrl() {
  if (useMemoryFallback) {
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error(
      "[Incremental Redis CacheHandler] REDIS_URL environment variable is not set."
    );
  }
  return redisUrl;
}

function getClient() {
  if (useMemoryFallback) return null;
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: getRedisUrl(),
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  redisClient.on("error", (err) => {
    console.error("[Incremental Redis CacheHandler] Redis client error:", err.message);
  });

  return redisClient;
}

async function connectClient() {
  const client = getClient();
  if (!client) return null;
  if (client.isOpen) return client;

  if (!connectPromise) {
    connectPromise = client
      .connect()
      .then(() => undefined)
      .finally(() => {
        connectPromise = null;
      });
  }

  await connectPromise;
  return client;
}

function replacer(_key, value) {
  if (Buffer.isBuffer(value)) {
    return {
      __type: "Buffer",
      data: value.toString("base64"),
    };
  }

  if (value instanceof Map) {
    return {
      __type: "Map",
      entries: Array.from(value.entries()),
    };
  }

  return value;
}

function reviver(_key, value) {
  if (!value || typeof value !== "object" || !value.__type) {
    if (value.type === "Buffer" && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  }

  if (value.__type === "Buffer") {
    return Buffer.from(value.data, "base64");
  }

  if (value.__type === "Map") {
    return new Map(value.entries);
  }

  return value;
}

function serializeCacheRecord(record) {
  return JSON.stringify(record, replacer);
}

function deserializeCacheRecord(serialized) {
  return JSON.parse(serialized, reviver);
}

function normalizeTtlSeconds(data, ctx) {
  if (data && data.kind === CachedRouteKind.FETCH) {
    if (typeof data.revalidate === "number" && data.revalidate > 0) {
      return Math.min(Math.max(Math.ceil(data.revalidate), 60), CACHE_ONE_YEAR_SECONDS);
    }
    return CACHE_ONE_YEAR_SECONDS;
  }

  const revalidate = ctx && ctx.cacheControl ? ctx.cacheControl.revalidate : undefined;

  if (revalidate === false || revalidate === INFINITE_CACHE || revalidate === undefined) {
    return CACHE_ONE_YEAR_SECONDS;
  }

  if (typeof revalidate === "number" && revalidate > 0) {
    return Math.min(Math.max(Math.ceil(revalidate), 60), CACHE_ONE_YEAR_SECONDS);
  }

  return 60;
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.filter(Boolean) : [];
}

function shouldUseLocalIncrementalStore(tags) {
  return normalizeTags(tags).some((tag) => tag.startsWith(INSTANCE_LOCAL_TAG_PREFIX));
}

function extractTagsFromValue(value, ctx) {
  if (!value) return [];

  if (value.kind === CachedRouteKind.FETCH) {
    return normalizeTags([
      ...(value.tags || []),
      ...(ctx && ctx.tags ? ctx.tags : []),
      ...(ctx && ctx.softTags ? ctx.softTags : []),
    ]);
  }

  const headers = value.headers;
  if (!headers) return [];

  const tagsHeader = headers[NEXT_CACHE_TAGS_HEADER];
  if (typeof tagsHeader === "string") {
    return tagsHeader
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (Array.isArray(tagsHeader)) {
    return tagsHeader
      .flatMap((part) => String(part).split(","))
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function isTagStateExpired(tagState, lastModified, isFetch) {
  if (!tagState || typeof lastModified !== "number") return false;

  if (typeof tagState.expired === "number" && tagState.expired >= lastModified) {
    return true;
  }

  if (isFetch && typeof tagState.stale === "number" && tagState.stale >= lastModified) {
    return true;
  }

  return false;
}

async function readTagStates(client, tags) {
  if (tags.length === 0) return [];

  if (!client) {
    return tags.map((tag) => memoryTagStates.get(tag) || null);
  }

  const values = await client.mGet(tags.map(tagMetaKey));
  return values.map((value) => {
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  });
}

class IncrementalRedisCacheHandler {
  constructor(ctx) {
    this.ctx = ctx;
    this.revalidatedTags = Array.isArray(ctx == null ? void 0 : ctx.revalidatedTags)
      ? ctx.revalidatedTags
      : [];
  }

  async get(cacheKey, ctx) {
    try {
      const requestedTags = normalizeTags([
        ...(ctx && ctx.tags ? ctx.tags : []),
        ...(ctx && ctx.softTags ? ctx.softTags : []),
      ]);
      const shouldUseLocalStore = shouldUseLocalIncrementalStore(requestedTags);
      const client = shouldUseLocalStore ? null : await connectClient();
      const stored = client
        ? await client.get(entryKey(cacheKey))
        : memoryEntries.get(entryKey(cacheKey));
      if (!stored) return null;

      const parsed = deserializeCacheRecord(stored);
      if (!parsed || typeof parsed !== "object" || !parsed.value) {
        return null;
      }

      const tags = extractTagsFromValue(parsed.value, ctx);
      if (tags.some((tag) => this.revalidatedTags.includes(tag))) {
        return null;
      }

      const tagStates = await readTagStates(client, tags);
      const isFetch = ctx && ctx.kind === IncrementalCacheKind.FETCH;
      if (tagStates.some((tagState) => isTagStateExpired(tagState, parsed.lastModified, isFetch))) {
        return null;
      }

      return parsed;
    } catch (err) {
      console.error("[Incremental Redis CacheHandler] get() error:", err.message);
      return null;
    }
  }

  async set(cacheKey, data, ctx) {
    if (!data) return;

    try {
      const tags = extractTagsFromValue(data, ctx);
      const shouldUseLocalStore = shouldUseLocalIncrementalStore(tags);
      const client = shouldUseLocalStore ? null : await connectClient();
      const record = {
        lastModified: Date.now(),
        value: data,
      };

      if (client) {
        await client.set(entryKey(cacheKey), serializeCacheRecord(record), {
          EX: normalizeTtlSeconds(data, ctx),
        });
      } else {
        memoryEntries.set(entryKey(cacheKey), serializeCacheRecord(record));
      }
    } catch (err) {
      console.error("[Incremental Redis CacheHandler] set() error:", err.message);
    }
  }

  async revalidateTag(tags, durations) {
    const normalizedTags = normalizeTags([tags].flat());
    if (normalizedTags.length === 0) return;

    const shouldUseLocalStore = shouldUseLocalIncrementalStore(normalizedTags);
    const client = shouldUseLocalStore ? null : await connectClient();
    const now = Date.now();
    const payload = durations
      ? {
          stale: now,
          ...(durations.expire !== undefined
            ? { expired: now + durations.expire * 1000 }
            : {}),
        }
      : {
          expired: now,
        };

    if (client) {
      await Promise.all(
        normalizedTags.map((tag) =>
          client.set(tagMetaKey(tag), JSON.stringify(payload), {
            EX: CACHE_ONE_YEAR_SECONDS,
          })
        )
      );
      return;
    }

    normalizedTags.forEach((tag) => {
      memoryTagStates.set(tag, payload);
    });
  }

  resetRequestCache() {}
}

module.exports = IncrementalRedisCacheHandler;
module.exports.__test = {
  serializeCacheRecord,
  deserializeCacheRecord,
  normalizeTtlSeconds,
  extractTagsFromValue,
  isTagStateExpired,
};
