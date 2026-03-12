import { NextResponse } from "next/server";
import { checkRedisPing } from "@/redis-handler";

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  const redis = await checkRedisPing();
  const ok = redis.ok;

  const payload = {
    status: ok ? "ok" : "degraded",
    now,
    checks: {
      redis: {
        ok: redis.ok,
        latencyMs: redis.latencyMs,
      },
    },
  };

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}

