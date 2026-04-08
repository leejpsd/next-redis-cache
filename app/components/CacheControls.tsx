"use client";

import { useState, useTransition } from "react";
import { invalidateRandomUser, postRandomUser } from "../action/actions";

type CacheState = "fresh" | "stale" | "hard";

interface CacheControlsProps {
  lastUpdatedAt: number;
}

function formatTime(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const statusCopy: Record<
  CacheState,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  fresh: {
    label: "Fresh",
    title: "현재 화면은 공유 캐시에서 제공된 최신 상태입니다.",
    description:
      "메인 카드가 여러 인스턴스에서 동일하게 보이면 Redis shared cache가 정상적으로 붙은 상태입니다.",
  },
  stale: {
    label: "Soft",
    title: "soft revalidate가 요청되었습니다.",
    description:
      "바로 새 값으로 바뀌지 않아도 정상입니다. 다음 요청들에서 stale 응답 후 백그라운드 재생성이 진행됩니다.",
  },
  hard: {
    label: "Hard",
    title: "hard invalidation이 요청되었습니다.",
    description:
      "캐시가 즉시 만료되므로 브라우저를 다시 요청하면 새 데이터가 바로 보일 가능성이 높습니다.",
  },
};

export function CacheControls({ lastUpdatedAt }: CacheControlsProps) {
  const [cacheState, setCacheState] = useState<CacheState>("fresh");
  const [isPending, startTransition] = useTransition();

  const handleSoftInvalidate = () => {
    startTransition(async () => {
      await invalidateRandomUser();
      setCacheState("stale");
    });
  };

  const handleHardInvalidate = () => {
    startTransition(async () => {
      await postRandomUser();
      setCacheState("hard");
    });
  };

  const status = statusCopy[cacheState];

  return (
    <aside className="glass-card equal-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Cache Control</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-stone-950">
            무효화 실험 패널
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">
            동일한 태그를 soft 방식과 hard 방식으로 무효화해 체감 차이를 비교합니다.
          </p>
        </div>

        <div className="status-pill shrink-0" data-state={cacheState}>
          <span className="dot" data-state={cacheState} />
          {status.label}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="metric-card rounded-2xl p-3.5">
          <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Last Generated
          </dt>
          <dd className="mt-2 font-mono text-sm text-stone-900">
            {formatTime(lastUpdatedAt ? new Date(lastUpdatedAt) : null)}
          </dd>
        </div>
        <div className="metric-card rounded-2xl p-3.5">
          <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Behavior
          </dt>
          <dd className="mt-2 text-sm font-medium text-stone-900">
            {cacheState === "fresh"
              ? "shared cache steady state"
              : cacheState === "stale"
              ? "stale-while-revalidate"
              : "immediate expire"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={handleSoftInvalidate}
          disabled={isPending}
          data-tone="soft"
          className="control-button px-4 py-3.5 text-left disabled:cursor-wait disabled:opacity-60"
        >
          <span className="flex items-center justify-between gap-3 text-sm font-semibold text-stone-950">
            <span>Server Action으로 soft revalidate</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
              Soft
            </span>
          </span>
          <span className="control-button-copy mt-2">
            <span className="text-sm leading-6 text-stone-600">
              <code>revalidateTag(&quot;random-user&quot;, &quot;max&quot;)</code>로 stale
              표시만 수행합니다.
            </span>
            <span className="text-xs font-medium text-amber-800">
              바로 새 값이 나오지 않아도 정상입니다.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={handleHardInvalidate}
          disabled={isPending}
          data-tone="hard"
          className="control-button px-4 py-3.5 text-left disabled:cursor-wait disabled:opacity-60"
        >
          <span className="flex items-center justify-between gap-3 text-sm font-semibold text-stone-950">
            <span>Webhook 시뮬레이션으로 hard invalidate</span>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-800">
              Hard
            </span>
          </span>
          <span className="control-button-copy mt-2">
            <span className="text-sm leading-6 text-stone-600">
              서명 검증을 통과한 뒤 즉시 만료를 요청합니다.
            </span>
            <span className="text-xs font-medium text-rose-800">
              새 요청에서 바로 다른 유저가 보이는지 확인할 때 적합합니다.
            </span>
          </span>
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-stone-300/80 bg-stone-950 px-4 py-4 text-stone-100">
        <p className="text-sm font-semibold">{status.title}</p>
        <p className="mt-2 text-sm leading-6 text-stone-300">{status.description}</p>
      </div>
    </aside>
  );
}
