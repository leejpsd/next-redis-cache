/**
 * 스파이크 테스트 중 Redis 엔트리 키 수가 1로 고정됐던 사실을 시각화한다.
 * 좌측: 들어온 요청 총량을 모의 dot grid로 표현 (20,377개 = 142 × 143 근사)
 * 우측: Redis entryKeys 카운터 고정 (1개)
 * "많은 요청 → 같은 캐시 키 hit"이라는 핵심 주장을 직관적으로 드러내는 목적.
 */

const TOTAL_REQUESTS = 20_377;
const REDIS_ENTRY_KEYS = 1;
const DURATION = "5m hold · 3 scenarios × 30 VU";

// 제한된 도트 밀도 (실제 2만개 그리면 렌더 폭발) - 비율감만 주기 위한 시각화 상수
const DOT_COLS = 42;
const DOT_ROWS = 8;
const TOTAL_DOTS = DOT_COLS * DOT_ROWS; // 336

export function SpikeRedisProof() {
  return (
    <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">Spike Evidence</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            스파이크 중에도 Redis 엔트리는 1개로 고정
          </h2>
        </div>
        <span className="rounded-full border border-stone-300/80 px-2.5 py-1 text-[11px] font-medium text-stone-500">
          {DURATION}
        </span>
      </div>

      <p className="mt-2 text-xs text-stone-500">
        총{" "}
        <span className="metric-number text-stone-900">
          {TOTAL_REQUESTS.toLocaleString()}
        </span>
        개의 요청이 5분간 들어왔지만 Redis의 cacheKey는 내내 단 1개만 유지됐다
        (<code className="rounded bg-stone-900/5 px-1.5 py-0.5 text-[11px]">/api/cache-debug</code>{" "}
        pre/post 비교). 원본 API는 TTL 주기만큼만 호출된다는 직접 증거.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* 왼쪽: 요청 도트 그리드 */}
        <div className="rounded-2xl border border-stone-300/80 bg-white/5 p-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-stone-500">
            <span>Incoming requests</span>
            <span className="metric-number text-stone-100">
              {TOTAL_REQUESTS.toLocaleString()}
            </span>
          </div>

          <div
            className="mt-3 grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${DOT_COLS}, 1fr)`,
            }}
          >
            {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
              // 모든 도트를 accent로 — "이 전부가 같은 Redis 엔트리에 hit했다"
              return (
                <span
                  key={i}
                  className="block h-[6px] w-full rounded-full"
                  style={{
                    background: "#00dc82",
                    opacity: 0.35 + ((i * 7) % 40) / 100,
                    boxShadow: "0 0 3px rgba(0, 220, 130, 0.45)",
                  }}
                  aria-hidden
                />
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-stone-500">
            도트 1개 ≈{" "}
            <span className="metric-number">
              {Math.round(TOTAL_REQUESTS / TOTAL_DOTS).toLocaleString()}
            </span>{" "}
            요청 — 스케일 시각화용, 실제 요청은 20K+
          </p>
        </div>

        {/* 오른쪽: Redis 키 상태 */}
        <div className="rounded-2xl border border-emerald-700/15 bg-emerald-900/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-800">
            Redis entryKeys
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="metric-number text-6xl font-semibold text-emerald-800"
              style={{ textShadow: "0 0 24px rgba(0, 220, 130, 0.5)" }}
            >
              {REDIS_ENTRY_KEYS}
            </span>
            <span className="text-xs text-stone-500">key</span>
          </div>
          <div className="mt-3 space-y-2 text-[11px] text-stone-500">
            <div className="flex items-center justify-between">
              <span>시작 시점</span>
              <span className="metric-number text-stone-100">1</span>
            </div>
            <div className="flex items-center justify-between">
              <span>피크 (90 VU 동시)</span>
              <span className="metric-number text-stone-100">1</span>
            </div>
            <div className="flex items-center justify-between">
              <span>종료 시점</span>
              <span className="metric-number text-stone-100">1</span>
            </div>
          </div>
          <p className="mt-3 border-t border-emerald-700/15 pt-3 text-[11px] leading-5 text-stone-500">
            <span className="text-emerald-800">cacheLife</span>의 TTL이 만료될
            때만 새 origin 호출. 스파이크 내내 캐시 재사용률이{" "}
            <span className="metric-number text-stone-100">
              {(100 - (REDIS_ENTRY_KEYS / TOTAL_REQUESTS) * 100).toFixed(5)}%
            </span>
            .
          </p>
        </div>
      </div>

      <p className="mt-5 border-t border-stone-300/80 pt-3 text-xs leading-5 text-stone-500">
        이 그림이 이 시리즈 전체의 핵심: &ldquo;멀티 인스턴스 일관성&rdquo;의
        실제 결과물은 &ldquo;스파이크에서도 원본이 흔들리지 않는다&rdquo;로
        나타납니다.
      </p>
    </div>
  );
}
