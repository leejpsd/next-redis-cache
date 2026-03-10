"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { invalidateRandomUser, postRandomUser } from "../action/actions";

type CacheState = "fresh" | "stale" | "hard";

interface CacheControlsProps {
  lastUpdatedAt: number; // 서버에서 내려준 timestamp
}

export function CacheControls({ lastUpdatedAt }: CacheControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // UI에서만 쓰는 상태들
  const [cacheState, setCacheState] = useState<CacheState>("fresh");
  const [canRefresh, setCanRefresh] = useState(false);

  const formatTime = (date: Date | null) => {
    if (!date) return "-";
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleInvalidateDirect = () => {
    startTransition(async () => {
      await invalidateRandomUser();
      // 서버 캐시는 무효화(stale) 상태가 됨
      setCacheState("stale");
      setCanRefresh(true);
    });
  };

  const handleInvalidateViaWebhook = () => {
    startTransition(async () => {
      await postRandomUser(); // 내부에서 revalidateTag(..., { expire: 0 }) 호출
      setCacheState("hard");
      setCanRefresh(true);
    });
  };

  const handleRefresh = () => {
    if (!canRefresh) return;

    // UX용으로 미리 fresh로 바꿔두고
    setCacheState("fresh");
    setCanRefresh(false);
    // setLastUpdatedAt(new Date());

    // 실제 서버 컴포넌트 다시 불러오기
    router.refresh();
  };

  const isWorking = isPending;

  return (
    <section className="mt-8 w-full max-w-xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      {/* 상단 헤더 + 상태 뱃지 */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
            Cache Control Panel
          </h2>
          <p className="text-xs text-slate-400">
            random-user 태그 기준 캐시 상태 모니터링
          </p>
        </div>

        {/* Live Badge */}
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border 
    ${
      cacheState === "fresh"
        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
        : cacheState === "stale"
        ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
        : "border-red-500/50 bg-red-500/10 text-red-300"
    }
  `}
        >
          <span
            className={`h-2 w-2 rounded-full 
      ${
        cacheState === "fresh"
          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
          : cacheState === "stale"
          ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
          : "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.7)]"
      }
    `}
          />
          <span className="uppercase tracking-wider">
            {cacheState === "fresh"
              ? "FRESH"
              : cacheState === "stale"
              ? "STALE"
              : "HARD"}
          </span>
        </div>
      </div>

      {/* 마지막 업데이트 시간 */}
      <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
        <span>마지막 데이터 업데이트</span>
        <span className="font-mono text-slate-300">
          {formatTime(lastUpdatedAt ? new Date(lastUpdatedAt) : null)}
        </span>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleInvalidateDirect}
            disabled={isWorking}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
              isWorking
                ? "bg-slate-700 text-slate-400 cursor-wait"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            {isWorking ? "처리 중..." : "서버 액션으로 무효화"}
          </button>

          <button
            type="button"
            onClick={handleInvalidateViaWebhook}
            disabled={isWorking}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
              isWorking
                ? "bg-slate-700 text-slate-400 cursor-wait"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            {isWorking ? "처리 중..." : "Webhook 시뮬레이션 무효화"}
          </button>
        </div>

        {/* 새로고침 버튼 */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={!canRefresh || isWorking}
          className={`mt-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition ${
            !canRefresh || isWorking
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : "bg-indigo-500/90 hover:bg-indigo-400 text-white border border-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.6)]"
          }`}
        >
          {canRefresh ? "🔄 새로고침으로 최신 데이터 보기" : "🔄 새로고침"}
        </button>
      </div>

      {/* 안내 문구 */}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {canRefresh ? (
          cacheState === "stale" ? (
            <>
              <b>
                무효화가 완료되었습니다. 기존 캐시는 그대로 유지되며
                백그라운드에서 최신 데이터가 준비됩니다.
              </b>
              “새로고침”을 누르면 준비된 최신 데이터로 교체됩니다.
            </>
          ) : (
            <>
              <b>
                무효화가 완료되었습니다. 캐시가 즉시 삭제되었으며, 현재 화면은
                더 이상 최신 데이터가 아닙니다.
              </b>{" "}
              “새로고침”을 눌러 새 데이터를 받아오세요.
            </>
          )
        ) : (
          <>
            지금 화면은 <b>캐싱된 데이터</b>를 보여주고 있습니다. 캐시를
            무효화한 뒤 새로고침하면 최신 데이터가 적용되는 과정을 확인할 수
            있어요.
          </>
        )}
      </p>
    </section>
  );
}
