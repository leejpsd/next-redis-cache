import Link from "next/link";

type StrategyRow = {
  key: string;
  label: string;
  href: string;
  serverP95Ms: number | null;
  spikeP95Ms: number | null;
  lcpMs: number | null;
  seoChars: number | null;
  tone: "good" | "mid" | "warn";
};

const SERVER_TABLE: StrategyRow[] = [
  {
    key: "ssr",
    label: "SSR (no-store)",
    href: "/experiments/ssr",
    serverP95Ms: 855,
    spikeP95Ms: 1950,
    lcpMs: 1900,
    seoChars: 3216,
    tone: "warn",
  },
  {
    key: "isr-fetch",
    label: "ISR (fetch revalidate)",
    href: "/experiments/isr-fetch",
    serverP95Ms: 324,
    spikeP95Ms: 1040,
    lcpMs: 1746,
    seoChars: 3239,
    tone: "good",
  },
  {
    key: "shared-cache",
    label: "Cache Components + Redis",
    href: "/experiments/shared-cache",
    serverP95Ms: 354,
    spikeP95Ms: 1790,
    lcpMs: 1904,
    seoChars: 3295,
    tone: "good",
  },
  {
    key: "hybrid",
    label: "Hybrid (Streaming SSR + 섹션별 Cache Components)",
    href: "/experiments/hybrid",
    serverP95Ms: null,
    spikeP95Ms: null,
    lcpMs: 1743,
    seoChars: 751,
    tone: "good",
  },
  {
    key: "csr",
    label: "CSR (direct client call)",
    href: "/experiments/csr",
    serverP95Ms: null,
    spikeP95Ms: null,
    lcpMs: 3200,
    seoChars: 165,
    tone: "warn",
  },
  {
    key: "bff",
    label: "BFF (via /api/bff)",
    href: "/experiments/bff",
    serverP95Ms: null,
    spikeP95Ms: null,
    lcpMs: 1987,
    seoChars: 143,
    tone: "mid",
  },
];

const COST_ROWS = [
  { item: "ECS Fargate (2 task × 0.5 vCPU × 1 GB)", cost: 44.98 },
  { item: "ALB (시간 + LCU)", cost: 25.55 },
  { item: "ElastiCache Redis cache.t4g.micro", cost: 16.06 },
  { item: "CloudWatch Logs + Container Insights", cost: 7.5 },
  { item: "Data Transfer (out)", cost: 4.22 },
] as const;

const COST_TOTAL = COST_ROWS.reduce((acc, r) => acc + r.cost, 0);

const SOAK_ROWS = [
  { label: "총 요청 수", value: "18,164" },
  { label: "처리량", value: "약 10 req/s" },
  { label: "avg 응답", value: "190ms" },
  { label: "p95 응답", value: "217ms" },
  { label: "에러율", value: "0.00% (실패 1건)" },
  { label: "Redis 키 (시작 → 종료)", value: "1 → 1 (누수 없음)" },
] as const;

const ORIGIN_FETCH_ROWS = [
  {
    strategy: "SSR (no-store)",
    fetchPerMonth: "1,000,000회",
    estimatedCost: "$100.00",
    tone: "warn" as const,
  },
  {
    strategy: "ISR / Cache Components (TTL 60s)",
    fetchPerMonth: "43,200회",
    estimatedCost: "$4.32",
    tone: "good" as const,
  },
  {
    strategy: "Hybrid (섹션별 TTL 혼합)",
    fetchPerMonth: "30,000~60,000회",
    estimatedCost: "$3.00~6.00",
    tone: "good" as const,
  },
  {
    strategy: "CSR (브라우저 직접 호출)",
    fetchPerMonth: "사용자 수 × 세션 수",
    estimatedCost: "—",
    tone: "warn" as const,
  },
];

const LIGHTHOUSE_4G = [
  { strategy: "ISR", lcp: 1746, score: 100, tone: "good" as const },
  { strategy: "Hybrid", lcp: 1743, score: 100, tone: "good" as const },
  { strategy: "shared-cache", lcp: 1904, score: 100, tone: "good" as const },
  { strategy: "SSR", lcp: 1900, score: 100, tone: "good" as const },
  { strategy: "BFF", lcp: 1987, score: 99, tone: "mid" as const },
  { strategy: "CSR", lcp: 3200, score: 93, tone: "warn" as const },
];

const LIGHTHOUSE_3G = [
  { strategy: "ISR / Hybrid", lcp: 5693, tone: "good" as const },
  { strategy: "SSR / shared-cache", lcp: 6093, tone: "mid" as const },
  { strategy: "BFF", lcp: 6275, tone: "mid" as const },
  { strategy: "CSR", lcp: 8398, tone: "warn" as const },
];

const INCIDENTS = [
  {
    title: "배포 경계 캐시 누수",
    symptom:
      "새 배포 후에도 CSR/BFF/SSR/shared-cache가 이전 빌드의 HTML(Turbopack 청크 참조)을 계속 서빙. 청크 404 유발.",
    diagnosis:
      "응답 헤더 x-nextjs-cache: HIT, Cache-Control: s-maxage=31536000. Redis 엔트리 키에 buildId 네임스페이스가 없어 배포 간 엔트리가 공유됨.",
    fix: "incremental-cache-handler.js의 entryKey에 BUILD_NAMESPACE(git SHA) prefix 추가. 태그 키는 공유 유지.",
    status: "Resolved (2026-04-20)",
  },
  {
    title: "Health endpoint 오판",
    symptom:
      "Redis 정상인데도 /api/health가 503, redis.latencyMs=-1 반환.",
    diagnosis:
      "await import('@/redis-handler') 동적 경로 해석이 production에서 간헐적 실패. catch 블록이 -1 하드코딩 반환.",
    fix: "lib/redis-client.ts에 pingRedis() static export, 1.5s 타임아웃, reason 분류 반환. /api/health가 이걸 사용.",
    status: "Resolved (2026-04-20)",
  },
] as const;

const MATRIX = [
  {
    strategy: "SSR (no-store)",
    serverPerf: "✗",
    spike: "✗",
    lcp: "○",
    seo: "◎",
    originSave: "✗",
    consistency: "◎",
    ops: "◎",
  },
  {
    strategy: "ISR (fetch revalidate)",
    serverPerf: "◎",
    spike: "◎",
    lcp: "◎",
    seo: "◎",
    originSave: "◎",
    consistency: "○",
    ops: "○",
  },
  {
    strategy: "Cache Components + Redis",
    serverPerf: "○",
    spike: "△",
    lcp: "○",
    seo: "◎",
    originSave: "◎",
    consistency: "◎",
    ops: "△",
  },
  {
    strategy: "Hybrid (Streaming + 섹션별)",
    serverPerf: "○",
    spike: "○",
    lcp: "◎",
    seo: "○",
    originSave: "◎",
    consistency: "◎",
    ops: "△",
  },
  {
    strategy: "CSR",
    serverPerf: "◎",
    spike: "○",
    lcp: "✗",
    seo: "✗",
    originSave: "✗",
    consistency: "각자",
    ops: "◎",
  },
  {
    strategy: "BFF",
    serverPerf: "△",
    spike: "△",
    lcp: "△",
    seo: "✗",
    originSave: "○",
    consistency: "◎",
    ops: "○",
  },
] as const;

const HIGHLIGHTS = [
  {
    title: "ISR p95 324ms",
    body: "평상시 서버 응답 기준 ISR이 가장 빠르다. 전략 선택의 기본값.",
  },
  {
    title: "Hybrid LCP 1743ms = ISR",
    body: "섹션별 독립 캐시를 얻으면서도 체감 성능은 ISR과 동률.",
  },
  {
    title: "Redis entryKeys 20K 요청 후에도 1개",
    body: "스파이크에서도 원본 호출은 TTL 주기만큼만. 공유 캐시가 실제로 동작.",
  },
  {
    title: "Soak 30분 에러율 0.00%",
    body: "태그 인덱스 누수 없음. 장시간 안정성 검증 통과.",
  },
  {
    title: "CSR LCP +83%",
    body: "ISR 대비 3.2초. Slow 3G에서는 8.4초로 격차 확대.",
  },
  {
    title: "CSR/BFF SEO 본문 143~165 chars",
    body: "사실상 빈 HTML. 공개 페이지 사용 금지.",
  },
] as const;

function toneClass(tone: StrategyRow["tone"]) {
  switch (tone) {
    case "good":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "mid":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "warn":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
}

function formatMs(value: number | null) {
  return value === null ? "—" : `${value}ms`;
}

function formatChars(value: number | null) {
  return value === null ? "—" : `${value.toLocaleString()} chars`;
}

export default function DashboardPage() {
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-[2.5rem]">
            렌더링 전략 실측 결과 요약
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
            2026-04-19 staging (ap-southeast-2 · ECS Fargate 2 task ·
            ElastiCache cache.t4g.micro) 기준으로 수집한 성능·비용·SEO 측정치를
            한 화면에 모았습니다. 실험 본문은 각 행의 링크에서 확인할 수 있고,
            상세 원본 데이터는{" "}
            <code className="rounded bg-stone-900/5 px-1.5 py-0.5 text-xs">
              docs/load-test/2026-04-19/
            </code>{" "}
            참조.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.title}
              className="glass-card rounded-[1.6rem] px-5 py-5"
            >
              <p className="eyebrow">Highlight</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-stone-950">
                {h.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{h.body}</p>
            </div>
          ))}
        </section>

        <section className="glass-card overflow-x-auto rounded-[2rem] px-6 py-6 sm:px-7">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="eyebrow">전략별 실측 지표</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
                서버 p95 · 스파이크 p95 · LCP · SEO
              </h2>
            </div>
            <Link
              href="/experiments"
              className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-800"
            >
              각 실험 보기
            </Link>
          </div>
          <table className="mt-5 w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 text-left font-medium">전략</th>
                <th className="py-2 text-right font-medium">서버 p95</th>
                <th className="py-2 text-right font-medium">스파이크 p95</th>
                <th className="py-2 text-right font-medium">LCP (모바일 4G)</th>
                <th className="py-2 text-right font-medium">SEO 본문</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60">
              {SERVER_TABLE.map((row) => (
                <tr key={row.key} className="align-middle">
                  <td className="py-3 pr-3">
                    <Link
                      href={row.href}
                      className="inline-flex items-center gap-2 font-medium text-stone-900 hover:underline"
                    >
                      {row.label}
                    </Link>
                  </td>
                  <td className="py-3 text-right text-stone-700">
                    {formatMs(row.serverP95Ms)}
                  </td>
                  <td className="py-3 text-right text-stone-700">
                    {formatMs(row.spikeP95Ms)}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass(
                        row.tone
                      )}`}
                    >
                      {formatMs(row.lcpMs)}
                    </span>
                  </td>
                  <td className="py-3 text-right text-stone-700">
                    {formatChars(row.seoChars)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Hybrid / CSR / BFF는 k6 측정 대상에 포함되지 않아 서버 p95는 표시하지
            않았습니다. LCP는 Lighthouse 로컬 production build 기준.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
            <p className="eyebrow">Lighthouse · 모바일 4G</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              사용자 체감 LCP
            </h2>
            <p className="mt-2 text-xs text-stone-500">
              5 runs × Moto G4 에뮬레이션, 로컬 production build
            </p>
            <table className="mt-5 w-full text-sm">
              <tbody className="divide-y divide-stone-200/60">
                {LIGHTHOUSE_4G.map((row) => (
                  <tr key={row.strategy}>
                    <td className="py-2 pr-3 font-medium text-stone-900">
                      {row.strategy}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass(
                          row.tone
                        )}`}
                      >
                        {row.lcp.toLocaleString()}ms
                      </span>
                    </td>
                    <td className="py-2 pl-3 text-right font-mono text-xs text-stone-600">
                      score {row.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              CSR은 LCP 3,200ms로 ISR 대비 +83%. 로딩 메시지가 LCP 후보로 잡히는
              Lighthouse 특성상 실제 체감은 이보다 더 느릴 수 있습니다.
            </p>
          </div>

          <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
            <p className="eyebrow">Lighthouse · Slow 3G</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              저속 네트워크에서의 격차 확대
            </h2>
            <p className="mt-2 text-xs text-stone-500">
              400kbps · RTT 400ms · CPU 4x 스로틀링
            </p>
            <table className="mt-5 w-full text-sm">
              <tbody className="divide-y divide-stone-200/60">
                {LIGHTHOUSE_3G.map((row) => (
                  <tr key={row.strategy}>
                    <td className="py-2 pr-3 font-medium text-stone-900">
                      {row.strategy}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass(
                          row.tone
                        )}`}
                      >
                        {row.lcp.toLocaleString()}ms
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              4G에서 +1.45초였던 CSR 격차가 3G에선 +2.7초로 벌어집니다. 저사양
              폰·지하철·해외 사용자 비중이 클수록 CSR이 더 비쌉니다.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
            <p className="eyebrow">Soak · 30분 장시간 테스트</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              Cache Components + Redis 안정성
            </h2>
            <p className="mt-2 text-xs text-stone-500">
              /experiments/shared-cache · 10 VU constant · 30 min
            </p>
            <table className="mt-5 w-full text-sm">
              <tbody className="divide-y divide-stone-200/60">
                {SOAK_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 pr-3 text-stone-700">{row.label}</td>
                    <td className="py-2 text-right font-mono text-stone-900">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              태그 인덱스 누수 없음, 메모리·네트워크 정상. `cacheLife` 만료
              주기마다 같은 키를 재사용한다는 증거.
            </p>
          </div>

          <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
            <p className="eyebrow">Origin API 호출량</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              공유 캐시가 실제로 아끼는 것
            </h2>
            <p className="mt-2 text-xs text-stone-500">
              월 100만 요청 · TTL 60s · 호출당 $0.0001 가정
            </p>
            <table className="mt-5 w-full text-sm">
              <tbody className="divide-y divide-stone-200/60">
                {ORIGIN_FETCH_ROWS.map((row) => (
                  <tr key={row.strategy}>
                    <td className="py-2 pr-3 font-medium text-stone-900">
                      {row.strategy}
                    </td>
                    <td className="py-2 text-right text-stone-700">
                      {row.fetchPerMonth}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass(
                          row.tone
                        )}`}
                      >
                        {row.estimatedCost}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              SSR만 쓰면 origin 호출 비용이 기본 인프라 비용($98)을 넘어섭니다.
              내부 백엔드여도 CPU/DB 비용으로 같은 구조.
            </p>
          </div>
        </section>

        <section className="glass-card overflow-x-auto rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Trade-off Matrix</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            전략별 강점·약점 한눈에
          </h2>
          <p className="mt-2 text-xs text-stone-500">
            ◎ 매우 좋음 · ○ 좋음 · △ 보통 · ✗ 나쁨
          </p>
          <table className="mt-5 w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 text-left font-medium">전략</th>
                <th className="py-2 text-center font-medium">서버</th>
                <th className="py-2 text-center font-medium">스파이크</th>
                <th className="py-2 text-center font-medium">LCP</th>
                <th className="py-2 text-center font-medium">SEO</th>
                <th className="py-2 text-center font-medium">Origin 절감</th>
                <th className="py-2 text-center font-medium">일관성</th>
                <th className="py-2 text-center font-medium">운영</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60">
              {MATRIX.map((row) => (
                <tr key={row.strategy}>
                  <td className="py-3 pr-3 font-medium text-stone-900">
                    {row.strategy}
                  </td>
                  <td className="py-3 text-center">{row.serverPerf}</td>
                  <td className="py-3 text-center">{row.spike}</td>
                  <td className="py-3 text-center">{row.lcp}</td>
                  <td className="py-3 text-center">{row.seo}</td>
                  <td className="py-3 text-center">{row.originSave}</td>
                  <td className="py-3 text-center">{row.consistency}</td>
                  <td className="py-3 text-center">{row.ops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
            <p className="eyebrow">Cost</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              월 예상 인프라 비용 (USD)
            </h2>
            <p className="mt-2 text-xs text-stone-500">
              ap-southeast-2 (Sydney) · 온디맨드 요율 · 월 100만 요청 가정
            </p>
            <table className="mt-5 w-full text-sm">
              <tbody className="divide-y divide-stone-200/60">
                {COST_ROWS.map((row) => (
                  <tr key={row.item}>
                    <td className="py-2 pr-3 text-stone-700">{row.item}</td>
                    <td className="py-2 text-right font-mono text-stone-900">
                      ${row.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-stone-300/80">
                  <td className="py-3 pr-3 font-semibold text-stone-900">
                    합계
                  </td>
                  <td className="py-3 text-right font-mono text-lg font-semibold text-stone-950">
                    ${COST_TOTAL.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              태스크 1개 절감(월 $22.49)만으로 Redis 비용($16.06)이 회수됩니다.
            </p>
          </div>

          <div className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
            <p className="eyebrow">Recommendation</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
              화면별 최선의 선택
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
              <li>
                <span className="font-semibold text-stone-900">
                  메인/대시보드:
                </span>{" "}
                Hybrid (Streaming SSR + 섹션별 Cache Components). 섹션별 독립
                TTL·태그·무효화.
              </li>
              <li>
                <span className="font-semibold text-stone-900">
                  상세·리스트:
                </span>{" "}
                ISR (fetch revalidate). 가장 무난한 기본값.
              </li>
              <li>
                <span className="font-semibold text-stone-900">
                  개인화 (마이페이지·장바구니):
                </span>{" "}
                SSR no-store + 필요 시 BFF. 캐시가 독이 되는 영역.
              </li>
              <li>
                <span className="font-semibold text-stone-900">
                  정적 문서 (약관·소개):
                </span>{" "}
                SSG (이 비교 밖). 빌드 시점 고정 콘텐츠면 항상 승.
              </li>
              <li>
                <span className="font-semibold text-stone-900">
                  인증 뒤 위젯:
                </span>{" "}
                CSR + BFF. 단, 공개 페이지 본문에는 절대 금지.
              </li>
            </ul>
          </div>
        </section>

        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Operations Incidents</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            측정 중 실제로 겪은 사고 2건
          </h2>
          <p className="mt-2 text-xs text-stone-500">
            4편을 마감하는 도중 staging에서 드러난 실제 운영 버그. 원인 규명부터
            수정·배포 검증까지 전 과정을 기록했습니다.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {INCIDENTS.map((inc) => (
              <article
                key={inc.title}
                className="rounded-2xl bg-stone-900/3 px-5 py-4 ring-1 ring-stone-900/5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-stone-950">
                    {inc.title}
                  </h3>
                  <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {inc.status}
                  </span>
                </div>
                <dl className="mt-3 space-y-2 text-xs leading-5 text-stone-600">
                  <div>
                    <dt className="font-semibold text-stone-800">증상</dt>
                    <dd className="mt-0.5">{inc.symptom}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-stone-800">원인</dt>
                    <dd className="mt-0.5">{inc.diagnosis}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-stone-800">수정</dt>
                    <dd className="mt-0.5">{inc.fix}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            두 사고 모두{" "}
            <code className="rounded bg-stone-900/5 px-1.5 py-0.5 text-xs">
              docs/incident/
            </code>{" "}
            에 원인·수정·재발방지까지 Resolution 상태로 문서화되어 있습니다.
          </p>
        </section>

        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Series</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            관련 글과 산출물
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
            <li>1편 · 멀티 인스턴스 캐시 불일치 개념</li>
            <li>2편 · Docker Redis 로컬 재현</li>
            <li>3편 · AWS Self-hosting 운영 검증 (ECS + Redis + ALB)</li>
            <li className="font-semibold text-stone-900">
              4편 · 렌더링 전략 실측과 최선의 선택 (이 대시보드)
            </li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            자세한 해석은{" "}
            <code className="rounded bg-stone-900/5 px-1.5 py-0.5 text-xs">
              docs/blog/next16-redis-rendering-strategies-part-4.md
            </code>
            . 측정 원본은{" "}
            <code className="rounded bg-stone-900/5 px-1.5 py-0.5 text-xs">
              docs/load-test/2026-04-19/
            </code>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
