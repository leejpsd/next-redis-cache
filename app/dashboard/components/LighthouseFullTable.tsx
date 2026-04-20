/**
 * Lighthouse로 측정한 모든 Core Web Vitals + 보조 지표를 전략별로 펼친 표.
 * 모바일 4G 프로파일(기본)과 Slow 3G 프로파일 두 개를 토글 없이 위아래로.
 */

type Row = {
  strategy: string;
  ttfb: number;
  fcp: number;
  lcp: number;
  tbt: number;
  speedIndex: number;
  tti: number;
  cls: number;
  score: number;
};

const MOBILE_4G: Row[] = [
  { strategy: "SSR", ttfb: 3.7, fcp: 756, lcp: 1900, tbt: 37, speedIndex: 1291, tti: 1909, cls: 0, score: 99.8 },
  { strategy: "ISR", ttfb: 7.2, fcp: 756, lcp: 1746, tbt: 40, speedIndex: 1075, tti: 1896, cls: 0, score: 100 },
  { strategy: "shared-cache", ttfb: 3.9, fcp: 755, lcp: 1904, tbt: 40, speedIndex: 1273, tti: 1911, cls: 0, score: 100 },
  { strategy: "Hybrid", ttfb: 3.8, fcp: 754, lcp: 1743, tbt: 39, speedIndex: 754, tti: 1893, cls: 0, score: 100 },
  { strategy: "CSR", ttfb: 4.0, fcp: 755, lcp: 3200, tbt: 40, speedIndex: 1239, tti: 3200, cls: 0, score: 93 },
  { strategy: "BFF", ttfb: 3.6, fcp: 755, lcp: 1987, tbt: 40, speedIndex: 1143, tti: 2057, cls: 0, score: 99 },
];

const SLOW_3G: Row[] = [
  { strategy: "SSR", ttfb: 3.7, fcp: 2005, lcp: 6119, tbt: 44, speedIndex: 0, tti: 0, cls: 0, score: 76 },
  { strategy: "ISR", ttfb: 3.8, fcp: 2004, lcp: 5693, tbt: 39, speedIndex: 0, tti: 0, cls: 0, score: 77 },
  { strategy: "shared-cache", ttfb: 3.1, fcp: 2005, lcp: 6093, tbt: 38, speedIndex: 0, tti: 0, cls: 0, score: 76 },
  { strategy: "Hybrid", ttfb: 3.5, fcp: 2004, lcp: 5692, tbt: 38, speedIndex: 0, tti: 0, cls: 0, score: 77 },
  { strategy: "CSR", ttfb: 3.5, fcp: 2004, lcp: 8398, tbt: 38, speedIndex: 0, tti: 0, cls: 0, score: 73.7 },
  { strategy: "BFF", ttfb: 3.3, fcp: 2006, lcp: 6275, tbt: 33, speedIndex: 0, tti: 0, cls: 0, score: 75.7 },
];

function ms(n: number) {
  if (n === 0) return "—";
  return `${n.toLocaleString()}`;
}

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-800";
  if (score >= 75) return "text-amber-800";
  return "text-rose-800";
}

function Table({
  title,
  caption,
  rows,
  showSpeedIndex,
}: {
  title: string;
  caption: string;
  rows: Row[];
  showSpeedIndex: boolean;
}) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <p className="mt-1 text-xs text-stone-500">{caption}</p>
      <table className="mt-3 w-full min-w-[720px] text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-stone-500">
          <tr>
            <th className="py-2 pr-3 text-left font-medium">전략</th>
            <th className="py-2 text-right font-medium" title="Time To First Byte (로컬 측정)">
              TTFB
            </th>
            <th className="py-2 text-right font-medium" title="First Contentful Paint">
              FCP
            </th>
            <th className="py-2 text-right font-medium" title="Largest Contentful Paint">
              LCP
            </th>
            <th className="py-2 text-right font-medium" title="Total Blocking Time">
              TBT
            </th>
            {showSpeedIndex ? (
              <>
                <th className="py-2 text-right font-medium" title="Speed Index">
                  SI
                </th>
                <th className="py-2 text-right font-medium" title="Time to Interactive">
                  TTI
                </th>
              </>
            ) : null}
            <th className="py-2 text-right font-medium" title="Cumulative Layout Shift">
              CLS
            </th>
            <th className="py-2 text-right font-medium">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200/60">
          {rows.map((r) => (
            <tr key={r.strategy}>
              <td className="py-2 pr-3 font-medium text-stone-950">{r.strategy}</td>
              <td className="py-2 text-right text-stone-700 metric-number">{ms(r.ttfb)}</td>
              <td className="py-2 text-right text-stone-700 metric-number">{ms(r.fcp)}</td>
              <td className="py-2 text-right font-semibold text-stone-950 metric-number">{ms(r.lcp)}</td>
              <td className="py-2 text-right text-stone-700 metric-number">{ms(r.tbt)}</td>
              {showSpeedIndex ? (
                <>
                  <td className="py-2 text-right text-stone-700 metric-number">{ms(r.speedIndex)}</td>
                  <td className="py-2 text-right text-stone-700 metric-number">{ms(r.tti)}</td>
                </>
              ) : null}
              <td className="py-2 text-right text-stone-700 metric-number">{r.cls.toFixed(3)}</td>
              <td className={`py-2 text-right font-semibold metric-number ${scoreColor(r.score)}`}>
                {r.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LighthouseFullTable() {
  return (
    <div className="glass-card overflow-x-auto rounded-[2rem] px-6 py-6 sm:px-7">
      <p className="eyebrow">사용자 체감 (Lighthouse)</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
        Core Web Vitals 전체 지표
      </h2>
      <p className="mt-2 text-xs text-stone-500">
        5 runs × Moto G4 에뮬레이션, 로컬 production build 기준. 모든 시간 단위는
        ms. TTFB는 로컬 Chrome 측정이라 네트워크 RTT가 사실상 0 — 실제
        네트워크 TTFB는 위의 k6 http_req_waiting 섹션 참조.
      </p>

      <div className="mt-6 space-y-7">
        <Table
          title="① 모바일 4G (Moto G4)"
          caption="1.6 Mbps · RTT 150ms · CPU 4x 스로틀링"
          rows={MOBILE_4G}
          showSpeedIndex
        />
        <Table
          title="② Slow 3G"
          caption="400 kbps · RTT 400ms · CPU 4x. LCP 격차가 4G 대비 더 크게 벌어지는 저속 환경."
          rows={SLOW_3G}
          showSpeedIndex={false}
        />
      </div>
    </div>
  );
}
