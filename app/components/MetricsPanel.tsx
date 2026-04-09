"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type HealthResponse = {
  status: "ok" | "degraded";
  now: number;
  checks: {
    redis: {
      ok: boolean;
      latencyMs: number;
    };
  };
  metrics: {
    revalidateAccepted: number;
    revalidateRejected: number;
    revalidateError: number;
    invalidationLatencyAvgMs: number;
    invalidationLatencyMaxMs: number;
    prefetchAutoAvgMs: number;
    prefetchAutoCount: number;
    prefetchTrueAvgMs: number;
    prefetchTrueCount: number;
    prefetchFalseAvgMs: number;
    prefetchFalseCount: number;
  };
};

type MetricsResponse = {
  status: "ok";
  now: number;
  metrics: {
    counters: {
      "revalidate.accepted": number;
      "revalidate.rejected": number;
      "revalidate.error": number;
      "consistency.check": number;
      "consistency.mismatch": number;
    };
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
    prefetchTransitionByMode: {
      auto: {
        count: number;
        sumMs: number;
        avgMs: number;
        maxMs: number;
      };
      true: {
        count: number;
        sumMs: number;
        avgMs: number;
        maxMs: number;
      };
      false: {
        count: number;
        sumMs: number;
        avgMs: number;
        maxMs: number;
      };
    };
  };
};

export function MetricsPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const load = async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/metrics", { cache: "no-store" }),
      ]);

      if (!healthRes.ok) {
        throw new Error(`health status ${healthRes.status}`);
      }
      if (!metricsRes.ok) {
        throw new Error(`metrics status ${metricsRes.status}`);
      }

      const [healthJson, metricsJson] = await Promise.all([
        healthRes.json() as Promise<HealthResponse>,
        metricsRes.json() as Promise<MetricsResponse>,
      ]);

      setHealth(healthJson);
      setMetrics(metricsJson);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load metrics");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const statusStyle = useMemo(() => {
    if (!health) return "text-stone-500 border-stone-300/80 bg-white/70";
    return health.status === "ok"
      ? "text-emerald-900 border-emerald-700/15 bg-emerald-900/5"
      : "text-amber-900 border-amber-700/15 bg-amber-900/5";
  }, [health]);

  return (
    <section className="glass-card equal-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Observability</p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-stone-950">
            Runtime metrics
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs ${statusStyle}`}>
            {health ? health.status.toUpperCase() : "LOADING"}
          </span>
          <button
            type="button"
            onClick={() => startTransition(() => void load())}
            disabled={isRefreshing}
            className="rounded-full border border-stone-300/80 bg-white/85 px-3 py-1 text-xs font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? "새로고침 중" : "새로고침"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-rose-700">metrics load error: {error}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <MetricItem
            label="Redis Ping"
            value={
              health
                ? `${health.checks.redis.ok ? "OK" : "FAIL"} (${health.checks.redis.latencyMs}ms)`
                : "-"
            }
          />
          <MetricItem
            label="Accepted"
            value={
              metrics ? String(metrics.metrics.counters["revalidate.accepted"]) : "-"
            }
          />
          <MetricItem
            label="Rejected"
            value={
              metrics ? String(metrics.metrics.counters["revalidate.rejected"]) : "-"
            }
          />
          <MetricItem
            label="Errors"
            value={metrics ? String(metrics.metrics.counters["revalidate.error"]) : "-"}
          />
          <MetricItem
            label="Latency Avg"
            value={
              metrics ? `${metrics.metrics.invalidationLatency.avgMs}ms` : "-"
            }
          />
          <MetricItem
            label="Latency Max"
            value={
              metrics ? `${metrics.metrics.invalidationLatency.maxMs}ms` : "-"
            }
          />
          <MetricItem
            label="Consistency Rate"
            value={
              metrics
                ? `${metrics.metrics.consistencyMismatchRate.ratePct}% (${metrics.metrics.consistencyMismatchRate.mismatches}/${metrics.metrics.consistencyMismatchRate.checks})`
                : "-"
            }
          />
          <MetricItem
            label="Prefetch auto"
            value={
              metrics
                ? `${metrics.metrics.prefetchTransitionByMode.auto.avgMs}ms (${metrics.metrics.prefetchTransitionByMode.auto.count})`
                : "-"
            }
          />
          <MetricItem
            label="Prefetch true"
            value={
              metrics
                ? `${metrics.metrics.prefetchTransitionByMode.true.avgMs}ms (${metrics.metrics.prefetchTransitionByMode.true.count})`
                : "-"
            }
          />
          <MetricItem
            label="Prefetch false"
            value={
              metrics
                ? `${metrics.metrics.prefetchTransitionByMode.false.avgMs}ms (${metrics.metrics.prefetchTransitionByMode.false.count})`
                : "-"
            }
          />
        </dl>
      )}
    </section>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card rounded-2xl p-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="mt-1 font-mono text-stone-950">{value}</dd>
    </div>
  );
}
