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
    <section className="glass-card equal-card rounded-[1.75rem] p-5 sm:p-6">
      <p className="eyebrow">Navigation Lab</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-stone-950">
        Prefetch comparison
      </h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        동일 페이지 이동을 prefetch 정책별로 실행해 전환 지연을 수집합니다.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Link
          href="/prefetch-target?mode=auto"
          onClick={() => markNavigation("auto")}
          className="rounded-2xl border border-stone-300/80 bg-white/85 px-4 py-3 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white"
        >
          auto (기본)
        </Link>

        <Link
          href="/prefetch-target?mode=true"
          prefetch
          onClick={() => markNavigation("true")}
          className="rounded-2xl border border-stone-300/80 bg-white/85 px-4 py-3 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white"
        >
          prefetch=true
        </Link>

        <Link
          href="/prefetch-target?mode=false"
          prefetch={false}
          onClick={() => markNavigation("false")}
          className="rounded-2xl border border-stone-300/80 bg-white/85 px-4 py-3 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white"
        >
          prefetch=false
        </Link>
      </div>
    </section>
  );
}
