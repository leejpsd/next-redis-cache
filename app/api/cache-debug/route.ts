import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis-client";
import { getRuntimeIdentity } from "@/lib/runtime-context";

async function collectKeys(pattern: string): Promise<string[]> {
  const redis = await getRedisClient();
  const keys: string[] = [];

  for await (const key of redis.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    keys.push(typeof key === "string" ? key : String(key));
  }

  return keys.sort();
}

export async function GET(): Promise<NextResponse> {
  try {
    const [entryKeys, tagKeys, tagExpirationKeys] = await Promise.all([
      collectKeys("next-cache:entry:*"),
      collectKeys("next-cache:tag:*"),
      collectKeys("next-cache:tag-expiration:*"),
    ]);

    return NextResponse.json(
      {
        runtime: getRuntimeIdentity(),
        cacheState: {
          entryKeys,
          tagKeys,
          tagExpirationKeys,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        runtime: getRuntimeIdentity(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
