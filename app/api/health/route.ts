import { NextResponse } from "next/server";
import { pingRedis } from "@/lib/redis-client";
import { getMetricSnapshot } from "@/lib/metrics";
import { getRuntimeIdentity } from "@/lib/runtime-context";

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  const redis = await pingRedis();
  const ok = redis.ok;
  const metrics = getMetricSnapshot();
  const runtime = getRuntimeIdentity();

  const payload = {
    status: ok ? "ok" : "degraded",
    now,
    runtime,
    checks: {
      redis: {
        ok: redis.ok,
        latencyMs: redis.latencyMs,
        reason: redis.reason ?? null,
      },
    },
    metrics: {
      revalidateAccepted: metrics.counters["revalidate.accepted"],
      revalidateRejected: metrics.counters["revalidate.rejected"],
      revalidateError: metrics.counters["revalidate.error"],
      invalidationLatencyAvgMs: metrics.invalidationLatency.avgMs,
      invalidationLatencyMaxMs: metrics.invalidationLatency.maxMs,
      consistencyMismatchRatePct: metrics.consistencyMismatchRate.ratePct,
      consistencyChecks: metrics.consistencyMismatchRate.checks,
      prefetchAutoAvgMs: metrics.prefetchTransitionByMode.auto.avgMs,
      prefetchAutoCount: metrics.prefetchTransitionByMode.auto.count,
      prefetchTrueAvgMs: metrics.prefetchTransitionByMode.true.avgMs,
      prefetchTrueCount: metrics.prefetchTransitionByMode.true.count,
      prefetchFalseAvgMs: metrics.prefetchTransitionByMode.false.avgMs,
      prefetchFalseCount: metrics.prefetchTransitionByMode.false.count,
    },
  };

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
