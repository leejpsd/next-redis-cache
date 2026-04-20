type Row = {
  strategy: string;
  fetchCount: number;
  costUsd: number | null;
  tone: "good" | "mid" | "warn";
  note?: string;
};

const ROWS: Row[] = [
  {
    strategy: "SSR (no-store)",
    fetchCount: 1_000_000,
    costUsd: 100,
    tone: "warn",
    note: "모든 요청이 원본 호출",
  },
  {
    strategy: "ISR / Cache Components",
    fetchCount: 43_200,
    costUsd: 4.32,
    tone: "good",
    note: "TTL 60s 기준",
  },
  {
    strategy: "Hybrid (섹션별 TTL)",
    fetchCount: 45_000,
    costUsd: 4.5,
    tone: "good",
    note: "배너 hours · 랭킹 minutes · 피드 no-store",
  },
  {
    strategy: "CSR (브라우저 직접)",
    fetchCount: 1_000_000,
    costUsd: null,
    tone: "warn",
    note: "사용자가 직접 호출, 원본에 그대로 쌓임",
  },
];

const MAX_COUNT = 1_000_000;
const LOG_MAX = Math.log10(MAX_COUNT);

// 로그 스케일 → 너비(%). 아주 작은 값도 최소 2%는 보이게 하한 설정.
function logWidthPct(value: number) {
  if (value <= 1) return 2;
  const pct = (Math.log10(value) / LOG_MAX) * 100;
  return Math.max(pct, 2);
}

const toneToColor: Record<Row["tone"], string> = {
  good: "#00dc82",
  mid: "#f5a623",
  warn: "#ff4d4f",
};

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function OriginFetchChart() {
  return (
    <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">Origin API · 호출량</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            월 100만 요청 기준 원본 API 호출 수 (로그 스케일)
          </h2>
        </div>
        <span className="rounded-full border border-stone-300/80 px-2.5 py-1 text-[11px] font-medium text-stone-500">
          TTL 60s · $0.0001/call 가정
        </span>
      </div>

      <p className="mt-2 text-xs text-stone-500">
        공유 캐시가 실제로 아끼는 것은{" "}
        <span className="metric-number text-stone-900">
          origin API 호출 비용 × 백엔드 부하
        </span>
        . SSR과 CSR은 구조적으로 TTL 기반 절감이 불가능합니다.
      </p>

      {/* 로그 스케일 눈금 */}
      <div className="mt-5 flex justify-between px-1 text-[10px] font-mono uppercase tracking-wider text-stone-500">
        {["1", "100", "10K", "100K", "1M"].map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="mt-1 h-[1px] w-full bg-stone-300/80" />
      <div className="mt-0.5 flex h-[6px] w-full items-start justify-between">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-[6px] w-[1px] bg-stone-300/80"
            aria-hidden
          />
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {ROWS.map((row) => {
          const color = toneToColor[row.tone];
          return (
            <div key={row.strategy}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-950">{row.strategy}</span>
                <span className="metric-number text-[11px] text-stone-600">
                  {formatCount(row.fetchCount)} 회 ·{" "}
                  {row.costUsd === null ? "—" : `$${row.costUsd.toFixed(2)}`}
                </span>
              </div>
              <div className="mt-1.5 relative h-[20px] w-full overflow-hidden rounded-md bg-white/5 ring-1 ring-stone-300/80">
                <div
                  className="h-full rounded-md transition-[width] duration-500"
                  style={{
                    width: `${logWidthPct(row.fetchCount)}%`,
                    background: `linear-gradient(90deg, ${color}cc, ${color})`,
                    boxShadow: `0 0 12px ${color}55`,
                  }}
                />
                <span
                  className="absolute inset-0 flex items-center pl-3 text-[10px] font-semibold uppercase tracking-wider text-stone-100"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                >
                  {formatCount(row.fetchCount)} / 월
                </span>
              </div>
              {row.note ? (
                <p className="mt-1 text-[11px] text-stone-500">{row.note}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-5 border-t border-stone-300/80 pt-3 text-xs leading-5 text-stone-500">
        SSR만 써도 origin 호출 비용이{" "}
        <span className="metric-number text-rose-900">$100/월</span>
        로 기본 인프라 비용 $98을 넘어섭니다. 내부 백엔드 API라도 CPU·DB·커넥션
        풀 같은 비용으로 똑같이 되돌아옵니다.
      </p>
    </div>
  );
}
