/**
 * 2026-04-14 측정 (staging): Playwright 7 iteration 기반 CSR/BFF 브라우저 타이밍.
 * pageReadyMs = 데이터가 DOM에 실제로 반영된 시점 (Lighthouse LCP보다 현실적)
 * browserFetchMs = fetch 순수 왕복 시간
 * readyToPaintMs = fetch 직후 화면 반영까지
 * bffServerMs = BFF 엔드포인트 처리 시간 (BFF만)
 */

type Row = {
  label: string;
  n: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
};

const CSR_ROWS: Row[] = [
  { label: "pageReadyMs", n: 7, avg: 1816.8, p50: 1818.3, p95: 1838.3, max: 1838.3 },
  { label: "browserFetchMs", n: 7, avg: 504.5, p50: 499.1, p95: 558.2, max: 558.2 },
  { label: "readyToPaintMs", n: 7, avg: 504.8, p50: 499.4, p95: 558.5, max: 558.5 },
];

const BFF_ROWS: Row[] = [
  { label: "pageReadyMs", n: 7, avg: 2442.7, p50: 1839.9, p95: 5052.6, max: 5052.6 },
  { label: "browserFetchMs", n: 7, avg: 1120.4, p50: 570.4, p95: 3690.7, max: 3690.7 },
  { label: "readyToPaintMs", n: 7, avg: 1120.9, p50: 571.0, p95: 3692.0, max: 3692.0 },
  { label: "bffServerMs", n: 7, avg: 933.9, p50: 384.0, p95: 3536.5, max: 3536.5 },
];

function ms(n: number) {
  return `${n.toLocaleString()}ms`;
}

function MetricTable({ title, rows, note }: { title: string; rows: Row[]; note: string }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <table className="mt-3 w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-stone-500">
          <tr>
            <th className="py-2 pr-3 text-left font-medium">지표</th>
            <th className="py-2 text-right font-medium">n</th>
            <th className="py-2 text-right font-medium">avg</th>
            <th className="py-2 text-right font-medium">p50</th>
            <th className="py-2 text-right font-medium">p95</th>
            <th className="py-2 text-right font-medium">max</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200/60">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-2 pr-3 font-medium text-stone-950 metric-number">{r.label}</td>
              <td className="py-2 text-right text-stone-600 metric-number">{r.n}</td>
              <td className="py-2 text-right text-stone-700 metric-number">{ms(r.avg)}</td>
              <td className="py-2 text-right text-stone-700 metric-number">{ms(r.p50)}</td>
              <td className="py-2 text-right font-semibold text-stone-950 metric-number">{ms(r.p95)}</td>
              <td className="py-2 text-right text-stone-500 metric-number">{ms(r.max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-stone-500">{note}</p>
    </div>
  );
}

export function BrowserTimingTable() {
  return (
    <div className="glass-card overflow-x-auto rounded-[2rem] px-6 py-6 sm:px-7">
      <p className="eyebrow">브라우저 계측 (Playwright)</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
        CSR / BFF — 실제 브라우저에서의 체감 시간
      </h2>
      <p className="mt-2 text-xs text-stone-500">
        2026-04-14 staging 측정, 7 iteration. 서버 렌더 없이 브라우저가
        직접 데이터를 받아 DOM에 꽂는 경로의 실시간 타이밍. Lighthouse LCP가
        놓치는 &ldquo;실제 데이터 도착 시점&rdquo;을 pageReadyMs로 잰 것.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <MetricTable
          title="① CSR (direct client call)"
          rows={CSR_ROWS}
          note="브라우저가 origin API를 직접 호출. pageReadyMs 1.8초대로 안정적이지만 7회 모두 SEO 본문 없음."
        />
        <MetricTable
          title="② BFF (via /api/bff)"
          rows={BFF_ROWS}
          note={`7회 중 2회가 outlier로 튐(p95 5s, max 5s). BFF 경유는 보안·관측성 이점이 있지만 네트워크 홉이 하나 더 있어 분산이 크다.`}
        />
      </div>

      <p className="mt-5 border-t border-stone-300/80 pt-3 text-xs leading-5 text-stone-500">
        pageReadyMs = 데이터가 DOM에 실제로 반영된 시점. Lighthouse의 LCP가
        &ldquo;로딩 메시지&rdquo;를 가장 큰 콘텐츠로 집어낼 수 있어 CSR 점수를
        과대평가하는 문제를 Playwright로 보완했습니다.
      </p>
    </div>
  );
}
