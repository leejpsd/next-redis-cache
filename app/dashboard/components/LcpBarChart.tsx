type Row = {
  strategy: string;
  fourG: number;
  slow3G: number;
  isWorst?: boolean;
  isBaseline?: boolean;
};

const ROWS: Row[] = [
  { strategy: "Hybrid", fourG: 1743, slow3G: 5693, isBaseline: true },
  { strategy: "ISR", fourG: 1746, slow3G: 5693 },
  { strategy: "SSR", fourG: 1900, slow3G: 6119 },
  { strategy: "shared-cache", fourG: 1904, slow3G: 6093 },
  { strategy: "BFF", fourG: 1987, slow3G: 6275 },
  { strategy: "CSR", fourG: 3200, slow3G: 8398, isWorst: true },
];

const CHART_MAX = 9000; // Slow 3G CSR 8398을 여유 있게 담기 위한 상한

function barWidthPct(value: number) {
  return (value / CHART_MAX) * 100;
}

function barColor(row: Row) {
  if (row.isWorst) return { fourG: "#ff4d4f", slow3G: "#ff4d4f" };
  if (row.isBaseline) return { fourG: "#00dc82", slow3G: "#00dc82" };
  return { fourG: "#3291ff", slow3G: "#3291ff" };
}

export function LcpBarChart() {
  return (
    <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">Lighthouse · LCP</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            전략별 LCP 비교 — 모바일 4G vs Slow 3G
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-stone-500">
          <Legend color="#00dc82" label="최적" />
          <Legend color="#3291ff" label="보통" />
          <Legend color="#ff4d4f" label="CSR" />
        </div>
      </div>

      <p className="mt-2 text-xs text-stone-500">
        위쪽 짙은 막대: 모바일 4G · 아래쪽 반투명 막대: Slow 3G (400kbps · RTT
        400ms · CPU 4x). 값이 작을수록 사용자 체감이 빠름.
      </p>

      <div className="mt-5 space-y-2">
        {ROWS.map((row) => {
          const color = barColor(row);
          return (
            <div key={row.strategy} className="space-y-1.5 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-950">
                  {row.strategy}
                  {row.isBaseline ? (
                    <span className="ml-2 rounded bg-emerald-900/5 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      baseline
                    </span>
                  ) : null}
                  {row.isWorst ? (
                    <span className="ml-2 rounded bg-rose-900/5 px-1.5 py-0.5 text-[10px] font-semibold text-rose-900">
                      +83% (4G)
                    </span>
                  ) : null}
                </span>
                <span className="metric-number text-[11px] text-stone-600">
                  {row.fourG.toLocaleString()}ms 4G · {row.slow3G.toLocaleString()}ms
                  3G
                </span>
              </div>

              {/* 4G 바 */}
              <div className="relative h-[14px] w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-stone-300/80">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${barWidthPct(row.fourG)}%`,
                    background: color.fourG,
                    boxShadow: `0 0 12px ${color.fourG}55`,
                  }}
                />
              </div>

              {/* Slow 3G 바 (반투명) */}
              <div className="relative h-[14px] w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-stone-300/80">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${barWidthPct(row.slow3G)}%`,
                    background: color.slow3G,
                    opacity: 0.42,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-stone-500">
        <ScaleNote label="0" />
        <ScaleNote label={`${(CHART_MAX / 1000).toFixed(1)}s`} align="right" />
      </div>

      <p className="mt-4 border-t border-stone-300/80 pt-3 text-xs leading-5 text-stone-500">
        4G에서 CSR은 ISR 대비 <span className="metric-number text-rose-900">+1,454ms</span> (
        +83%), Slow 3G에선 <span className="metric-number text-rose-900">+2,705ms</span>
        까지 벌어집니다. 저속 네트워크·저사양 기기 비중이 큰 서비스일수록 CSR 비용이
        빠르게 증가합니다.
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2 w-3 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      />
      {label}
    </span>
  );
}

function ScaleNote({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <span className={align === "right" ? "ml-auto" : ""}>
      <span className="metric-number">{label}</span>
    </span>
  );
}
