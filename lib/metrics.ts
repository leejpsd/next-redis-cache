type CounterKey =
  | "revalidate.accepted"
  | "revalidate.rejected"
  | "revalidate.error"
  | "consistency.check"
  | "consistency.mismatch";

export type PrefetchMode = "auto" | "true" | "false";

type LatencyBucket = {
  count: number;
  sumMs: number;
  avgMs: number;
  maxMs: number;
};

type MetricSnapshot = {
  counters: Record<CounterKey, number>;
  invalidationLatency: LatencyBucket;
  consistencyMismatchRate: {
    checks: number;
    mismatches: number;
    ratePct: number;
  };
  prefetchTransitionByMode: Record<PrefetchMode, LatencyBucket>;
};

const counters: Record<CounterKey, number> = {
  "revalidate.accepted": 0,
  "revalidate.rejected": 0,
  "revalidate.error": 0,
  "consistency.check": 0,
  "consistency.mismatch": 0,
};

let latencyCount = 0;
let latencySumMs = 0;
let latencyMaxMs = 0;

const prefetchLatencyByMode: Record<PrefetchMode, { count: number; sumMs: number; maxMs: number }> = {
  auto: { count: 0, sumMs: 0, maxMs: 0 },
  true: { count: 0, sumMs: 0, maxMs: 0 },
  false: { count: 0, sumMs: 0, maxMs: 0 },
};

export function incMetric(key: CounterKey): void {
  counters[key] += 1;
}

export function observeInvalidationLatency(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  latencyCount += 1;
  latencySumMs += ms;
  latencyMaxMs = Math.max(latencyMaxMs, ms);
}

export function observeConsistencyMismatch(mismatch: boolean): void {
  counters["consistency.check"] += 1;
  if (mismatch) {
    counters["consistency.mismatch"] += 1;
  }
}

export function observePrefetchTransition(mode: PrefetchMode, ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  const bucket = prefetchLatencyByMode[mode];
  bucket.count += 1;
  bucket.sumMs += ms;
  bucket.maxMs = Math.max(bucket.maxMs, ms);
}

function toLatencyBucket(source: { count: number; sumMs: number; maxMs: number }): LatencyBucket {
  return {
    count: source.count,
    sumMs: source.sumMs,
    avgMs: source.count === 0 ? 0 : Math.round(source.sumMs / source.count),
    maxMs: source.maxMs,
  };
}

export function getMetricSnapshot(): MetricSnapshot {
  const checks = counters["consistency.check"];
  const mismatches = counters["consistency.mismatch"];

  return {
    counters: { ...counters },
    invalidationLatency: toLatencyBucket({
      count: latencyCount,
      sumMs: latencySumMs,
      maxMs: latencyMaxMs,
    }),
    consistencyMismatchRate: {
      checks,
      mismatches,
      ratePct: checks === 0 ? 0 : Number(((mismatches / checks) * 100).toFixed(2)),
    },
    prefetchTransitionByMode: {
      auto: toLatencyBucket(prefetchLatencyByMode.auto),
      true: toLatencyBucket(prefetchLatencyByMode.true),
      false: toLatencyBucket(prefetchLatencyByMode.false),
    },
  };
}
