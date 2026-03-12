"use client";

import { useEffect, useMemo, useState } from "react";

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
  };
};

export function MetricsPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

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

        if (!cancelled) {
          setHealth(healthJson);
          setMetrics(metricsJson);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "failed to load metrics");
        }
      }
    };

    void load();
    const timer = setInterval(load, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const statusStyle = useMemo(() => {
    if (!health) return "text-slate-400 border-slate-700";
    return health.status === "ok"
      ? "text-emerald-300 border-emerald-600/40 bg-emerald-900/20"
      : "text-amber-300 border-amber-600/40 bg-amber-900/20";
  }, [health]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Runtime Metrics</h3>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${statusStyle}`}>
          {health ? health.status.toUpperCase() : "LOADING"}
        </span>
      </div>

      {error ? (
        <p className="text-xs text-red-300">metrics load error: {error}</p>
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
        </dl>
      )}
    </section>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-1 font-mono text-slate-100">{value}</dd>
    </div>
  );
}
