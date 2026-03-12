type CounterKey =
  | "revalidate.accepted"
  | "revalidate.rejected"
  | "revalidate.error"
  | "consistency.check"
  | "consistency.mismatch";

type MetricSnapshot = {
  counters: Record<CounterKey, number>;
    invalidationLatency: {
      count: number;
      sumMs: number;
      avgMs: number;
      maxMs: number;
    };
    consistencyMismatchRate: {
      checks: number;
      mismatches: number;
      ratePct: number;
    };
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

export function getMetricSnapshot(): MetricSnapshot {
  const checks = counters["consistency.check"];
  const mismatches = counters["consistency.mismatch"];

  return {
    counters: { ...counters },
    invalidationLatency: {
      count: latencyCount,
      sumMs: latencySumMs,
      avgMs: latencyCount === 0 ? 0 : Math.round(latencySumMs / latencyCount),
      maxMs: latencyMaxMs,
    },
    consistencyMismatchRate: {
      checks,
      mismatches,
      ratePct: checks === 0 ? 0 : Number(((mismatches / checks) * 100).toFixed(2)),
    },
  };
}
