import { createClient, type RedisClientType } from "redis";
import { env } from "@/lib/env";

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
