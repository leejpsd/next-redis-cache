type CounterKey =
  | "revalidate.accepted"
  | "revalidate.rejected"
  | "revalidate.error";

type MetricSnapshot = {
  counters: Record<CounterKey, number>;
  invalidationLatency: {
    count: number;
    sumMs: number;
    avgMs: number;
    maxMs: number;
  };
};

const counters: Record<CounterKey, number> = {
  "revalidate.accepted": 0,
  "revalidate.rejected": 0,
  "revalidate.error": 0,
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

export function getMetricSnapshot(): MetricSnapshot {
  return {
    counters: { ...counters },
    invalidationLatency: {
      count: latencyCount,
      sumMs: latencySumMs,
      avgMs: latencyCount === 0 ? 0 : Math.round(latencySumMs / latencyCount),
      maxMs: latencyMaxMs,
    },
  };
}

