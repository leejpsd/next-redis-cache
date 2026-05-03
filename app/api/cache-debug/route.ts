import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis-client";
import { getRuntimeIdentity } from "@/lib/runtime-context";

async function collectKeys(pattern: string): Promise<string[]> {
  const redis = await getRedisClient();
  const keys: string[] = [];

  // redis@5의 scanIterator는 chunk(string[]) 단위로 yield. spread 필수.
  for await (const chunk of redis.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    if (Array.isArray(chunk)) {
      for (const k of chunk) keys.push(String(k));
    } else {
      keys.push(String(chunk));
    }
  }

  return keys.sort();
}

export async function GET(): Promise<NextResponse> {
  try {
    const [
      entryKeys,
      tagKeys,
      tagExpirationKeys,
      incrementalEntryKeys,
      incrementalTagKeys,
    ] = await Promise.all([
      collectKeys("next-cache:entry:*"),
      collectKeys("next-cache:tag:*"),
      collectKeys("next-cache:tag-expiration:*"),
      collectKeys("next-incremental:entry:*"),
      collectKeys("next-incremental:tag:*"),
    ]);

    return NextResponse.json(
      {
        runtime: getRuntimeIdentity(),
        cacheState: {
          // Cache Components(use cache) 영역
          entryKeys,
          tagKeys,
          tagExpirationKeys,
          // ISR/route cache (cacheHandler) 영역 — prerender HTML이 여기 저장됨
          incrementalEntryKeys,
          incrementalTagKeys,
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
