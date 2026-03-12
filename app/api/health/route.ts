import { NextResponse } from "next/server";
import { checkRedisPing } from "@/redis-handler";
import { getMetricSnapshot } from "@/lib/metrics";

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  const redis = await checkRedisPing();
  const ok = redis.ok;
  const metrics = getMetricSnapshot();

  const payload = {
    status: ok ? "ok" : "degraded",
    now,
    checks: {
      redis: {
        ok: redis.ok,
        latencyMs: redis.latencyMs,
      },
    },
    metrics: {
      revalidateAccepted: metrics.counters["revalidate.accepted"],
      revalidateRejected: metrics.counters["revalidate.rejected"],
      revalidateError: metrics.counters["revalidate.error"],
      invalidationLatencyAvgMs: metrics.invalidationLatency.avgMs,
      invalidationLatencyMaxMs: metrics.invalidationLatency.maxMs,
    },
  };

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
