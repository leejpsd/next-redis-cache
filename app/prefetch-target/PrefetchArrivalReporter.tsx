"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

const PREFETCH_NAV_MARKER = "prefetch-nav-marker";

type PrefetchMode = "auto" | "true" | "false";

type NavigationMarker = {
  mode: PrefetchMode;
  startedAt: number;
};

function isMode(value: string): value is PrefetchMode {
  return value === "auto" || value === "true" || value === "false";
}

export function PrefetchArrivalReporter() {
  const params = useSearchParams();
  const mode = params.get("mode");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.sessionStorage.getItem(PREFETCH_NAV_MARKER);
    if (!raw) return;

    window.sessionStorage.removeItem(PREFETCH_NAV_MARKER);

    const marker = JSON.parse(raw) as NavigationMarker;
    if (!isMode(marker.mode) || !Number.isFinite(marker.startedAt)) return;

    const currentMode = isMode(mode ?? "") ? mode : marker.mode;
    const elapsed = Math.max(0, Date.now() - marker.startedAt);

    void fetch("/api/metrics/prefetch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ mode: currentMode, latencyMs: elapsed }),
      keepalive: true,
    }).catch(() => null);
  }, [mode]);

  const modeLabel = useMemo(() => {
    if (!isMode(mode ?? "")) return "unknown";
    return mode;
  }, [mode]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      <h1 className="text-lg font-semibold text-slate-50">Prefetch Target</h1>
      <p className="mt-2 text-sm text-slate-300">선택 모드: {modeLabel}</p>
      <p className="mt-1 text-sm text-slate-300">전환 지연은 도착 시점에 자동 기록됩니다.</p>
      <Link
        href="/"
        className="mt-4 inline-flex rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
      >
        홈으로 돌아가기
      </Link>
    </section>
  );
}
