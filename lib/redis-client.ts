import { createClient, type RedisClientType } from "redis";
import { env } from "@/lib/env";

const PING_TIMEOUT_MS = 1500;
const useMemoryFallback = process.env.CACHE_HANDLER_FALLBACK === "memory";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<void> | null = null;

function getOrCreateClient(): RedisClientType {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  redisClient.on("error", (err: Error) => {
    console.error("[redis-client] Redis client error:", err.message);
  });

  return redisClient;
}

export async function getRedisClient(): Promise<RedisClientType> {
  const client = getOrCreateClient();
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

export type RedisPingResult = {
  ok: boolean;
  latencyMs: number;
  reason?: "fallback" | "disconnected" | "timeout" | "error";
};

/**
 * /api/health에서 사용할 Redis readiness 체크.
 * - 메모리 fallback 모드면 즉시 ok 반환
 * - 연결 실패/타임아웃을 이유(reason)와 함께 보고
 * - 타임아웃 1.5s로 health 응답이 Redis 지연에 끌려가지 않게 한다
 */
export async function pingRedis(): Promise<RedisPingResult> {
  if (useMemoryFallback) {
    return { ok: true, latencyMs: 0, reason: "fallback" };
  }

  const start = Date.now();
  try {
    const client = await getRedisClient();

    const pingResult = await Promise.race<string | "__timeout__">([
      client.ping(),
      new Promise<"__timeout__">((resolve) =>
        setTimeout(() => resolve("__timeout__"), PING_TIMEOUT_MS)
      ),
    ]);

    if (pingResult === "__timeout__") {
      return { ok: false, latencyMs: Date.now() - start, reason: "timeout" };
    }

    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const reason: RedisPingResult["reason"] =
      err instanceof Error && /not (open|ready)|closed/i.test(err.message)
        ? "disconnected"
        : "error";
    return { ok: false, latencyMs, reason };
  }
}
