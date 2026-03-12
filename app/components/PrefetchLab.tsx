"use client";

import Link from "next/link";

const PREFETCH_NAV_MARKER = "prefetch-nav-marker";

type PrefetchMode = "auto" | "true" | "false";

function markNavigation(mode: PrefetchMode) {
  if (typeof window === "undefined") return;

  const payload = {
    mode,
    startedAt: Date.now(),
  };

  window.sessionStorage.setItem(PREFETCH_NAV_MARKER, JSON.stringify(payload));
}

export function PrefetchLab() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-slate-100">Prefetch Lab</h3>
      <p className="mt-1 text-xs text-slate-400">
        동일 페이지 이동을 prefetch 정책별로 실행해 전환 지연을 수집합니다.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Link
          href="/prefetch-target?mode=auto"
          onClick={() => markNavigation("auto")}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
        >
          auto (기본)
        </Link>

        <Link
          href="/prefetch-target?mode=true"
          prefetch
          onClick={() => markNavigation("true")}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
        >
          prefetch=true
        </Link>

        <Link
          href="/prefetch-target?mode=false"
          prefetch={false}
          onClick={() => markNavigation("false")}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
        >
          prefetch=false
        </Link>
      </div>
    </section>
  );
}
