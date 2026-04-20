/**
 * 같은 URL을 browser/googlebot/naked-curl UA로 요청했을 때
 * HTML 본문 텍스트 길이 비교. (로컬 prod build 기준, 2026-04-19)
 */

type Row = {
  strategy: string;
  browser: number;
  googlebot: number;
  nakedCurl: number;
  hasCSRLoading: boolean;
};

const ROWS: Row[] = [
  { strategy: "SSR", browser: 3216, googlebot: 3174, nakedCurl: 3242, hasCSRLoading: false },
  { strategy: "ISR", browser: 3239, googlebot: 3239, nakedCurl: 3239, hasCSRLoading: false },
  { strategy: "Cache Components", browser: 3295, googlebot: 3231, nakedCurl: 3331, hasCSRLoading: false },
  { strategy: "Hybrid", browser: 751, googlebot: 685, nakedCurl: 741, hasCSRLoading: false },
  { strategy: "CSR", browser: 165, googlebot: 93, nakedCurl: 165, hasCSRLoading: true },
  { strategy: "BFF", browser: 143, googlebot: 80, nakedCurl: 143, hasCSRLoading: true },
];

function toneClass(chars: number) {
  if (chars >= 3000) return "text-emerald-800";
  if (chars >= 500) return "text-amber-800";
  return "text-rose-800";
}

export function SeoTable() {
  return (
    <div className="glass-card overflow-x-auto rounded-[2rem] px-6 py-6 sm:px-7">
      <p className="eyebrow">SEO · 초기 HTML 본문</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
        User-Agent별 HTML 텍스트 길이 (chars)
      </h2>
      <p className="mt-2 text-xs text-stone-500">
        크롤러나 JS 실행이 안 되는 환경에서 페이지가 실제로 얼마나 내용을
        보여주는지. 3,000+ = 풀 본문 · 500~1,000 = shell + fallback (Hybrid는
        이후 스트리밍으로 채워짐) · 100~200 = 사실상 빈 페이지.
      </p>
      <table className="mt-5 w-full min-w-[560px] text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-stone-500">
          <tr>
            <th className="py-2 pr-3 text-left font-medium">전략</th>
            <th className="py-2 text-right font-medium" title="일반 데스크톱/모바일 브라우저 UA">
              Browser
            </th>
            <th className="py-2 text-right font-medium" title="Googlebot 크롤러 UA">
              Googlebot
            </th>
            <th className="py-2 text-right font-medium" title="curl/8.0 (JS 실행 없음)">
              naked curl
            </th>
            <th className="py-2 text-right font-medium">CSR 로딩 마커</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200/60">
          {ROWS.map((r) => (
            <tr key={r.strategy}>
              <td className="py-2 pr-3 font-medium text-stone-950">{r.strategy}</td>
              <td
                className={`py-2 text-right font-semibold metric-number ${toneClass(r.browser)}`}
              >
                {r.browser.toLocaleString()}
              </td>
              <td
                className={`py-2 text-right metric-number ${toneClass(r.googlebot)}`}
              >
                {r.googlebot.toLocaleString()}
              </td>
              <td
                className={`py-2 text-right metric-number ${toneClass(r.nakedCurl)}`}
              >
                {r.nakedCurl.toLocaleString()}
              </td>
              <td className="py-2 text-right text-xs">
                {r.hasCSRLoading ? (
                  <span className="rounded-full bg-rose-900/5 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                    로딩 메시지만
                  </span>
                ) : (
                  <span className="text-stone-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 border-t border-stone-300/80 pt-3 text-xs leading-5 text-stone-500">
        CSR/BFF는 Googlebot에게 80~93 chars만 노출 — &ldquo;브라우저에서 데이터를
        가져오는 중입니다&rdquo; 로딩 메시지 수준. 공개 페이지 본문 영역에 CSR을
        쓰면 안 되는 이유가 이 한 줄로 설명됩니다.
      </p>
    </div>
  );
}
