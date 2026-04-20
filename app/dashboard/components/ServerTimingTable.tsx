/**
 * k6 rendering-strategies / spike / soak 결과의 모든 지표를 전략별로 펼친 표.
 * - baseline(5 VU × 45s)
 * - spike(3 scenarios × 30 VU × 5m hold)
 * - soak(10 VU × 30m, shared-cache만)
 */

type K6Row = {
  strategy: string;
  min: number;
  med: number;
  avg: number;
  p90: number;
  p95: number;
  max: number;
};

const BASELINE: K6Row[] = [
  { strategy: "SSR (no-store)", min: 382.6, med: 425.9, avg: 481.4, p90: 597.7, p95: 855.3, max: 1377.9 },
  { strategy: "ISR (fetch revalidate)", min: 148.4, med: 187.5, avg: 222.5, p90: 245.2, p95: 323.9, max: 1229.4 },
  { strategy: "Cache Components + Redis", min: 162.2, med: 183.9, avg: 228.1, p90: 274.7, p95: 353.9, max: 1179.7 },
];

const SPIKE: K6Row[] = [
  { strategy: "SSR (no-store)", min: 155.2, med: 1011.2, avg: 1121.0, p90: 1738.1, p95: 1954.8, max: 5432.2 },
  { strategy: "ISR (fetch revalidate)", min: 148.4, med: 409.3, avg: 481.8, p90: 825.5, p95: 1043.3, max: 3506.0 },
  { strategy: "Cache Components + Redis", min: 152.9, med: 811.5, avg: 898.6, p90: 1527.5, p95: 1799.9, max: 4238.6 },
];

const SOAK: K6Row[] = [
  { strategy: "Cache Components + Redis", min: 156.7, med: 181.5, avg: 190.1, p90: 192.9, p95: 217.5, max: 1170.3 },
];

const TTFB_PROXY = {
  avg: 201.3,
  p50: 177.7,
  p90: 233.9,
  p95: 315.9,
  min: 145.6,
  max: 1071.7,
};

const TOTALS = {
  baseline: { reqs: 856, errors: 1, errorPct: 0.12, vus: 15, duration: "45s × 3 scenarios" },
  spike: { reqs: 20377, errors: 108, errorPct: 0.53, vus: 90, duration: "1m ramp + 3m hold × 3 scenarios" },
  soak: { reqs: 18164, errors: 1, errorPct: 0.006, vus: 10, duration: "30m constant, shared-cache only" },
};

function ms(n: number) {
  return `${n.toLocaleString()}ms`;
}

function Table({ title, rows, note }: { title: string; rows: K6Row[]; note?: string }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <table className="mt-3 w-full min-w-[560px] text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-stone-500">
          <tr>
            <th className="py-2 pr-3 text-left font-medium">전략</th>
            <th className="py-2 text-right font-medium">min</th>
            <th className="py-2 text-right font-medium">p50 (중앙값)</th>
            <th className="py-2 text-right font-medium">avg</th>
            <th className="py-2 text-right font-medium">p90</th>
            <th className="py-2 text-right font-medium">p95</th>
            <th className="py-2 text-right font-medium">max</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200/60">
          {rows.map((r) => (
            <tr key={r.strategy}>
              <td className="py-2 pr-3 font-medium text-stone-950">{r.strategy}</td>
              <td className="py-2 text-right text-stone-600 metric-number">{ms(r.min)}</td>
              <td className="py-2 text-right text-stone-700 metric-number">{ms(r.med)}</td>
              <td className="py-2 text-right text-stone-700 metric-number">{ms(r.avg)}</td>
              <td className="py-2 text-right text-stone-600 metric-number">{ms(r.p90)}</td>
              <td className="py-2 text-right font-semibold text-stone-950 metric-number">{ms(r.p95)}</td>
              <td className="py-2 text-right text-stone-500 metric-number">{ms(r.max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note ? <p className="mt-2 text-[11px] text-stone-500">{note}</p> : null}
    </div>
  );
}

export function ServerTimingTable() {
  return (
    <div className="glass-card overflow-x-auto rounded-[2rem] px-6 py-6 sm:px-7">
      <p className="eyebrow">부하 테스트 (k6)</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
        서버 응답 시간 전체 지표
      </h2>
      <p className="mt-2 text-xs text-stone-500">
        세 가지 부하 프로파일 — 평상시 · 스파이크 · 장시간. 각 전략별로
        min / p50 / avg / p90 / p95 / max를 빠짐없이 수록했습니다.
      </p>

      {/* TTFB proxy 카드 */}
      <div className="mt-5 rounded-2xl border border-stone-300/80 bg-white/5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
              TTFB (Time To First Byte) · k6 http_req_waiting 기준
            </p>
            <p className="mt-1 text-xs text-stone-500">
              요청 후 서버가 첫 바이트를 돌려줄 때까지의 네트워크 대기 시간.
              평상시 세 전략 합산.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <Stat label="avg" value={ms(TTFB_PROXY.avg)} />
            <Stat label="p50" value={ms(TTFB_PROXY.p50)} />
            <Stat label="p90" value={ms(TTFB_PROXY.p90)} />
            <Stat label="p95" value={ms(TTFB_PROXY.p95)} highlight />
            <Stat label="min→max" value={`${ms(TTFB_PROXY.min)} – ${ms(TTFB_PROXY.max)}`} />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-7">
        <Table
          title={`① 평상시 (baseline) · 총 ${TOTALS.baseline.reqs.toLocaleString()} req · 에러율 ${TOTALS.baseline.errorPct}%`}
          rows={BASELINE}
          note={`5 VU constant × 3 scenarios × 45s. 평균 18.5 req/s.`}
        />
        <Table
          title={`② 스파이크 (spike) · 총 ${TOTALS.spike.reqs.toLocaleString()} req · 에러율 ${TOTALS.spike.errorPct}%`}
          rows={SPIKE}
          note={`3 scenarios 동시 실행, 각 30 VU까지 ramp-up 후 3분 hold. 피크 동시 90 VU, 평균 67.8 req/s.`}
        />
        <Table
          title={`③ 장시간 (soak) · 총 ${TOTALS.soak.reqs.toLocaleString()} req · 에러율 ${TOTALS.soak.errorPct}%`}
          rows={SOAK}
          note={`10 VU × 30분 constant. 평균 10 req/s. Redis 태그 인덱스 누수·메모리 증가 없음.`}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p>
      <p
        className={`metric-number text-sm ${
          highlight ? "font-semibold text-stone-950" : "text-stone-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
