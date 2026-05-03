import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis-client";
import { env } from "@/lib/env";
import { getRuntimeIdentity } from "@/lib/runtime-context";

/**
 * /api/cache-flush — 운영 incident 대응용 admin endpoint.
 *
 * 사용 시나리오:
 *  - 옛 배포의 prerender HTML이 Redis incremental cache(`next-incremental:entry:*`)에
 *    1년 TTL로 갇혀 새 배포에도 hit되는 사고가 났을 때.
 *  - 한 번 호출하여 incremental 영역만 flush.
 *  - Cache Components(`next-cache:*`)는 동작에 영향 없으므로 기본적으로 건드리지 않는다.
 *
 * 보안:
 *  - REVALIDATION_SECRET을 Bearer 헤더로 받아야만 동작.
 *  - 운영 종료 시 endpoint는 PR로 제거.
 *
 * 사용 예:
 *   curl -X POST 'http://<staging-alb>/api/cache-flush?scope=incremental' \
 *     -H "authorization: Bearer $REVALIDATION_SECRET"
 */

const ALLOWED_SCOPES = new Set(["incremental", "use-cache", "all"]);

const SCOPE_PATTERNS: Record<string, string[]> = {
  incremental: ["next-incremental:entry:*", "next-incremental:tag:*"],
  "use-cache": [
    "next-cache:entry:*",
    "next-cache:tag:*",
    "next-cache:tag-expiration:*",
  ],
  all: [
    "next-incremental:entry:*",
    "next-incremental:tag:*",
    "next-cache:entry:*",
    "next-cache:tag:*",
    "next-cache:tag-expiration:*",
  ],
};

async function deleteByPattern(pattern: string): Promise<number> {
  const redis = await getRedisClient();
  let deleted = 0;
  const batch: string[] = [];

  // redis@5의 scanIterator는 chunk(string[]) 단위로 yield한다.
  // v4와 달리 한 키씩 yield하지 않으므로 spread 처리 필수.
  for await (const chunk of redis.scanIterator({ MATCH: pattern, COUNT: 200 })) {
    const keys = Array.isArray(chunk) ? chunk.map(String) : [String(chunk)];
    batch.push(...keys);
    if (batch.length >= 500) {
      deleted += await redis.del(batch);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    deleted += await redis.del(batch);
  }

  return deleted;
}

function unauthorized(reason: string) {
  return NextResponse.json(
    { runtime: getRuntimeIdentity(), error: reason },
    { status: 401 }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization") || "";
  const expected = `Bearer ${env.REVALIDATION_SECRET}`;
  if (auth !== expected) {
    return unauthorized("invalid_authorization");
  }

  const scope = request.nextUrl.searchParams.get("scope") ?? "incremental";
  if (!ALLOWED_SCOPES.has(scope)) {
    return NextResponse.json(
      {
        runtime: getRuntimeIdentity(),
        error: "invalid_scope",
        allowed: Array.from(ALLOWED_SCOPES),
      },
      { status: 400 }
    );
  }

  try {
    const patterns = SCOPE_PATTERNS[scope];
    const results: Record<string, number> = {};
    let total = 0;

    for (const pattern of patterns) {
      const deleted = await deleteByPattern(pattern);
      results[pattern] = deleted;
      total += deleted;
    }

    return NextResponse.json(
      {
        runtime: getRuntimeIdentity(),
        scope,
        deleted: total,
        breakdown: results,
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
