import Link from "next/link";
import { ArchitectureDiagram } from "./components/ArchitectureDiagram";
import { BrowserTimingTable } from "./components/BrowserTimingTable";
import { ClimaxBanner } from "./components/ClimaxBanner";
import { CsrOriginLiveCard } from "./components/CsrOriginLiveCard";
import { FinalCta } from "./components/FinalCta";
import { GlossaryCard } from "./components/GlossaryCard";
import { LcpBarChart } from "./components/LcpBarChart";
import { LighthouseFullTable } from "./components/LighthouseFullTable";
import { OriginFetchChart } from "./components/OriginFetchChart";
import { PropagationCard } from "./components/PropagationCard";
import { ReproducibleBlock } from "./components/ReproducibleBlock";
import { SeoTable } from "./components/SeoTable";
import { ServerTimingTable } from "./components/ServerTimingTable";
import { SourceLink } from "./components/SourceLink";
import { SpikeRedisProof } from "./components/SpikeRedisProof";
import { StickyToc } from "./components/StickyToc";
import { StoryTransition } from "./components/StoryTransition";
import { Verdict } from "./components/Verdict";

const COST_ROWS = [
  { item: "ECS Fargate (2 task × 0.5 vCPU × 1 GB)", cost: 44.98 },
  { item: "ALB (시간 + LCU)", cost: 25.55 },
  { item: "ElastiCache Redis cache.t4g.micro", cost: 16.06 },
  { item: "CloudWatch Logs + Container Insights", cost: 7.5 },
  { item: "Data Transfer (out)", cost: 4.22 },
] as const;

const COST_TOTAL = COST_ROWS.reduce((acc, r) => acc + r.cost, 0);

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
  { strategy: "SSR (no-store)", serverPerf: "✗", spike: "✗", lcp: "○", seo: "◎", originSave: "✗", consistency: "◎", ops: "◎" },
  { strategy: "ISR (fetch revalidate)", serverPerf: "◎", spike: "◎", lcp: "◎", seo: "◎", originSave: "◎", consistency: "○", ops: "○" },
  { strategy: "Cache Components + Redis", serverPerf: "○", spike: "△", lcp: "○", seo: "◎", originSave: "◎", consistency: "◎", ops: "△" },
  { strategy: "Hybrid (Streaming + 섹션별)", serverPerf: "○", spike: "○", lcp: "◎", seo: "○", originSave: "◎", consistency: "◎", ops: "△" },
  { strategy: "CSR", serverPerf: "◎", spike: "○", lcp: "✗", seo: "✗", originSave: "✗", consistency: "각자", ops: "◎" },
  { strategy: "BFF", serverPerf: "△", spike: "△", lcp: "△", seo: "✗", originSave: "○", consistency: "◎", ops: "○" },
] as const;

const RECOMMENDATIONS = [
  {
    screen: "메인 / 대시보드",
    detail: "배너 · 랭킹 · 피드처럼 서로 다른 갱신 주기가 한 화면에 있을 때",
    pick: "Hybrid",
    reason: "Streaming SSR로 shell을 즉시 내려주고, 섹션별로 다른 cacheLife. 체감 LCP는 ISR과 동률(1,743ms)이면서 태그별 독립 무효화.",
    tone: "good" as const,
  },
  {
    screen: "상세 · 리스트",
    detail: "단일 성격의 데이터, 갱신 주기가 일정한 화면",
    pick: "ISR (fetch revalidate)",
    reason: "fetch 한 줄로 기본값부터 강함. p95 324ms, 스파이크에서도 1.04s로 가장 견고한 전략.",
    tone: "good" as const,
  },
  {
    screen: "개인화 (마이페이지 · 장바구니)",
    detail: "세션별로 달라야 하는 콘텐츠",
    pick: "SSR no-store + 필요 시 BFF",
    reason: "캐시 자체가 위험한 영역. 일관성의 정의가 '멀티 인스턴스 공유'가 아니라 '세션 경계 격리'다.",
    tone: "warn" as const,
  },
  {
    screen: "정적 문서 (약관 · 소개)",
    detail: "배포 시점에 결정되는 콘텐츠",
    pick: "SSG (이 비교 밖)",
    reason: "이 시리즈가 푸는 문제(공유 캐시 일관성)가 원천적으로 발생하지 않는 구조. 가능하면 SSG가 언제나 이긴다.",
    tone: "good" as const,
  },
  {
    screen: "인증 뒤 위젯",
    detail: "실시간 알림·채팅처럼 이미 서버 렌더 이점이 없는 영역",
    pick: "CSR + BFF",
    reason: "단, 공개 페이지 본문에는 절대 쓰지 않는다. Googlebot에 80~93 chars만 노출되는 문제.",
    tone: "mid" as const,
  },
];

function toneClass(tone: "good" | "mid" | "warn") {
  switch (tone) {
    case "good":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "mid":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "warn":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }
}

export default function DashboardPage() {
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto flex w-full max-w-[80rem] gap-8">
        <StickyToc />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* ──────────────────────────────────────
           NAV
           ────────────────────────────────────── */}
        <nav className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300/80 bg-white/85 px-3 py-1.5 text-stone-950 transition-colors hover:border-stone-300 hover:bg-stone-100"
          >
            ← Home
          </Link>
          <Link
            href="/experiments"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300/80 bg-white/85 px-3 py-1.5 text-stone-950 transition-colors hover:border-stone-300 hover:bg-stone-100"
          >
            Experiments →
          </Link>
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-stone-300/80 px-3 py-1.5 text-stone-600">
            <span className="dot" data-state="fresh" />
            staging · live
          </span>
        </nav>

        {/* ──────────────────────────────────────
           HERO — 결론 먼저
           ────────────────────────────────────── */}
        <section
          id="toc-hero"
          className="glass-card rounded-[2rem] px-6 py-7 sm:px-8 scroll-mt-20"
        >
          <p className="eyebrow">Dashboard · 렌더링 전략 실측</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-[2.6rem] sm:leading-[1.1]">
            &ldquo;CSR이 서버비 아끼고 사용자한테 넘기면 되지 않나&rdquo;
            <span className="block text-stone-500">— 반만 맞는 이야기다.</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600 sm:text-[0.95rem]">
            이 대시보드는 2026-04-19 staging(ap-southeast-2 · ECS Fargate 2 task
            · ElastiCache cache.t4g.micro)에서 k6 / Lighthouse / Playwright로
            잰 수치를 순서대로 보여줍니다. 서버 시간만 보면 CSR이 이긴 것처럼
            보이지만, <span className="text-rose-900">사용자 체감 · SEO · 원본
            API 비용</span> 세 축을 함께 놓으면 그림이 완전히 달라집니다.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            <HeroStat label="서버 p95 (ISR, 평상시)" value="324ms" tone="good" />
            <HeroStat label="체감 LCP (CSR, 모바일 4G)" value="3,200ms" tone="warn" />
            <HeroStat label="SEO 본문 (CSR, Googlebot)" value="93 chars" tone="warn" />
          </ul>

          <p className="mt-5 rounded-2xl border border-stone-300/80 bg-white/5 px-4 py-3 text-xs leading-6 text-stone-600">
            <span className="font-semibold text-stone-950">결론 먼저:</span>{" "}
            화면마다 다르다. 공개 페이지 본문은{" "}
            <span className="font-semibold text-emerald-800">
              ISR · Cache Components · Hybrid
            </span>
            , 개인화·인증 뒤 위젯은{" "}
            <span className="font-semibold text-amber-800">
              SSR / CSR + BFF
            </span>
            . &ldquo;전부 CSR&rdquo;은 거의 항상 오답.
          </p>
        </section>

        {/* ──────────────────────────────────────
           ARCHITECTURE
           ────────────────────────────────────── */}
        <div id="toc-arch" className="scroll-mt-20">
          <ArchitectureDiagram />
        </div>

        {/* ──────────────────────────────────────
           ACT 1: 얼핏 본 답 — 서버 시간만 보면 CSR 승
           ────────────────────────────────────── */}
        <div id="toc-act1" className="scroll-mt-20">
          <StoryTransition tone="question">
            <span className="font-semibold text-stone-950">Act 1. </span>
            먼저 서버 시간만 비교해보자. 이 축에서만 보면 &ldquo;서버가 렌더하지
            않는 CSR이 가장 가볍다&rdquo;는 결론이 자연스럽게 나온다.
          </StoryTransition>
        </div>

        <ServerTimingTable />

        <Verdict
          tone="warn"
          title="서버 축만 보면 CSR이 이긴 것 같다"
          source={
            <SourceLink
              sources={[
                {
                  label: "baseline",
                  path: "docs/load-test/2026-04-19/rendering-strategies.json",
                },
                {
                  label: "spike",
                  path: "docs/load-test/2026-04-19/spike.json",
                },
                {
                  label: "soak",
                  path: "docs/load-test/2026-04-19/soak.json",
                },
              ]}
            />
          }
        >
          서버 관점에선 SSR이 제일 무겁고, ISR · Cache Components가 균형, CSR은
          서버 렌더가 아예 없으니 부하 0. 여기서 끊으면 &ldquo;CSR로 가자&rdquo;는
          결론이 된다.{" "}
          <span className="font-semibold text-stone-950">
            하지만 이 축은 전체 비용의 1/3일 뿐이다.
          </span>
        </Verdict>

        {/* ──────────────────────────────────────
           ACT 2-1: 숨은 비용 1 — 사용자 체감
           ────────────────────────────────────── */}
        <div id="toc-act2-lcp" className="scroll-mt-20">
          <StoryTransition tone="twist">
            <span className="font-semibold text-stone-950">
              Act 2. 그런데 사용자는 &ldquo;서버 시간&rdquo;을 느끼지 않는다.
            </span>{" "}
            사용자가 느끼는 건 &ldquo;가장 큰 콘텐츠가 언제 뜨는가&rdquo;(LCP)다.
            같은 CSR을 브라우저 관점에서 다시 재보자.
          </StoryTransition>
        </div>

        <LcpBarChart />

        <Verdict
          tone="danger"
          title="CSR은 모바일 4G에서 ISR 대비 +83%, Slow 3G에선 +2,705ms 느리다"
          source={
            <SourceLink
              sources={[
                {
                  label: "4G",
                  path: "docs/load-test/2026-04-19/web-vitals-mobile-local.json",
                },
                {
                  label: "Slow 3G",
                  path: "docs/load-test/2026-04-19/web-vitals-slow3g.json",
                },
              ]}
            />
          }
        >
          ISR 1,746ms / CSR 3,200ms. CSR은 HTML→JS 로드→브라우저 fetch→paint
          순서라 구조적으로 느리다. 이 격차는{" "}
          <span className="font-semibold text-rose-900">
            서버비 절감액(월 $22)을 훨씬 넘어서는 사용자 이탈·전환율 손실
          </span>
          로 되돌아온다. 저사양 폰·저속 망 비중이 클수록 더 비싸진다.
        </Verdict>

        {/* ──────────────────────────────────────
           ACT 2-2: 숨은 비용 2 — SEO
           ────────────────────────────────────── */}
        <div id="toc-act2-seo" className="scroll-mt-20">
          <StoryTransition tone="twist">
            <span className="font-semibold text-stone-950">
              Act 2. 그리고 크롤러 · JS 실패 환경에서는 CSR이 &ldquo;보이지 않는
              페이지&rdquo;가 된다.
            </span>
          </StoryTransition>
        </div>

        <SeoTable />

        <Verdict
          tone="danger"
          title="CSR/BFF HTML은 Googlebot에 80~93 chars만 노출된다"
          source={
            <SourceLink
              sources={[
                {
                  label: "원본",
                  path: "docs/load-test/2026-04-19/seo-html-local.json",
                },
                {
                  label: "스크립트",
                  path: "scripts/measure-seo-html.mjs",
                },
              ]}
            />
          }
        >
          SSR/ISR/Cache Components는 3,200+ chars 풀 본문, Hybrid는 shell +
          스트리밍 fallback 포함 751 chars. CSR/BFF는{" "}
          <span className="font-semibold text-rose-900">
            &ldquo;브라우저에서 데이터를 가져오는 중입니다&rdquo; 로딩 메시지가
            전부
          </span>
          다. 단, 인증 뒤 대시보드·실시간 채팅처럼 SEO가 필요 없는 자리에서는
          CSR이 여전히 맞는 선택 — <span className="text-stone-950">공개 페이지 본문</span>
          에만 쓰지 말자는 얘기다.
        </Verdict>

        {/* ──────────────────────────────────────
           ACT 2-3: 숨은 비용 3 — 원본 API 폭증
           ────────────────────────────────────── */}
        <div id="toc-act2-origin" className="scroll-mt-20">
          <StoryTransition tone="twist">
            <span className="font-semibold text-stone-950">
              Act 2. 먼저 CSR의 정당한 이점을 인정하고 가자.
            </span>{" "}
            CSR은 서버 CPU·렌더 비용을 완전히 없앤다. 내부 어드민·인증 뒤
            실시간 위젯처럼 SEO가 필요 없고 &ldquo;서버를 거치지 않는 게 낫다&rdquo;는
            자리에선 여전히 옳은 선택이다.{" "}
            <span className="font-semibold text-stone-950">
              문제는 그 대가가 어디로 가는가.
            </span>{" "}
            실측해보면 결론은 깔끔하다 — 서버비는 줄지만 origin API 비용이 그만큼
            정확히 올라간다.
          </StoryTransition>
        </div>

        <CsrOriginLiveCard />

        <OriginFetchChart />

        <Verdict
          tone="danger"
          title="CSR은 세션당 정확히 1회 — 사용자 수와 1:1로 묶인다"
          source={
            <SourceLink
              sources={[
                {
                  label: "원본",
                  path: "docs/load-test/2026-04-20/origin-fetch-per-session.json",
                },
                {
                  label: "스크립트",
                  path: "scripts/measure-origin-fetch-per-session.mjs",
                },
              ]}
              reproduce={`APP_BASE_URL=http://localhost:3000 SESSION_COUNT=10 \\
  node scripts/measure-origin-fetch-per-session.mjs`}
            />
          }
        >
          5 세션 실측에서 min=max=1, 분산 0. 월 100만 세션이면 100만 호출이
          그대로. ISR/Hybrid는 같은 트래픽에서{" "}
          <span className="metric-number text-emerald-800">약 23배 적은</span>{" "}
          43K 수준. &ldquo;서버비 절감&rdquo;은 결국 백엔드 CPU/DB로
          <span className="font-semibold text-rose-900">옮겨갈 뿐</span>이다.
        </Verdict>

        {/* ──────────────────────────────────────
           ACT 3: 공유 캐시가 만든 차이
           ────────────────────────────────────── */}
        <div id="toc-act3" className="scroll-mt-20">
          <StoryTransition tone="evidence">
            <span className="font-semibold text-stone-950">
              Act 3. 축을 바꿔보자 — 공유 캐시는 뭘 바꿨는가?
            </span>{" "}
            지금까지는 &ldquo;CSR vs 서버 렌더&rdquo;였다. 이제는 &ldquo;공유 캐시 있을 때
            vs 없을 때&rdquo;다. 이게 이 시리즈의 원래 주제이기도 하다.
          </StoryTransition>
        </div>

        <SpikeRedisProof />

        <Verdict
          tone="good"
          title="20,377 요청이 몰려도 Redis 엔트리는 1개로 고정 · Soak 30분 에러율 0.00%"
          source={
            <SourceLink
              sources={[
                {
                  label: "spike",
                  path: "docs/load-test/2026-04-19/spike.json",
                },
                {
                  label: "soak",
                  path: "docs/load-test/2026-04-19/soak.json",
                },
                {
                  label: "Redis 상태",
                  path: "docs/load-test/2026-04-19/cache-debug-post-{spike,soak}.json",
                },
              ]}
            />
          }
        >
          공유 캐시의 진짜 가치는{" "}
          <span className="font-semibold text-emerald-800">
            &ldquo;스파이크에서도 원본 API가 흔들리지 않는다&rdquo;
          </span>
          로 나타난다. Redis cache.t4g.micro 월 $16은 태스크 1개 절감(월
          $22)만으로 회수된다. Soak 30분 간 태그 인덱스 누수·메모리 증가 없음.
        </Verdict>

        <StoryTransition tone="evidence">
          <span className="font-semibold text-stone-950">
            Act 3. 그럼 무효화는 태스크 간에 얼마나 빨리 전파되나?
          </span>{" "}
          1편에서 지적한 &ldquo;EC2 #1은 최신, #2는 옛날&rdquo;이 실제로
          몇 ms까지 좁혀지는지 두 포트에 같은 Redis를 물린 상태로 실측했다.
        </StoryTransition>

        <PropagationCard />

        <Verdict
          tone="good"
          title="A/B 태스크 편차 0ms · 평균 6.4ms — 사실상 동시 반영"
          source={
            <SourceLink
              sources={[
                {
                  label: "원본",
                  path: "docs/load-test/2026-04-20/revalidate-tag-propagation.json",
                },
                {
                  label: "스크립트",
                  path: "scripts/measure-revalidate-tag-propagation.mjs",
                },
              ]}
              reproduce={`# 두 태스크를 같은 Redis에 붙여 실행
redis-server --daemonize yes
PORT=3000 REDIS_URL=redis://localhost:6379 npm start &
PORT=3001 REDIS_URL=redis://localhost:6379 npm start &

TASK_A_URL=http://localhost:3000 \\
TASK_B_URL=http://localhost:3001 \\
ROUNDS=5 POLL_INTERVAL_MS=100 \\
  node scripts/measure-revalidate-tag-propagation.mjs`}
            />
          }
        >
          5 round 모두 <span className="metric-number text-emerald-800">첫 polling 내 감지</span>.
          무효화 후 6.4ms 안에 두 태스크 모두 새 값을 반환했고 A/B 편차 0ms.
          1편에서 지적한 캐시 불일치 문제가{" "}
          <span className="font-semibold text-emerald-800">
            실질적으로 해결됐다는 직접 증거
          </span>.
        </Verdict>

        {/* ──────────────────────────────────────
           ACT 4: 결론 — 화면별 최선의 선택
           ────────────────────────────────────── */}
        <div id="toc-climax" className="scroll-mt-20">
          <ClimaxBanner />
        </div>

        <div id="toc-act4" className="scroll-mt-20">
          <StoryTransition tone="conclusion">
            <span className="font-semibold text-stone-950">
              Act 4. 그래서 어떤 전략을 어디에 쓰는가.
            </span>{" "}
            실측 결과 기반 매칭표. 단, &ldquo;CSR이 무조건 오답&rdquo;은 아니다 —
            공개 본문 밖의 자리(인증 뒤 · 실시간 위젯)에선 여전히 맞는 선택.
          </StoryTransition>
        </div>

        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Recommendation · 화면·섹션별 최선의 선택</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            결론: 전략은 섹션 성격으로 고른다
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            App Router에선 한 화면 안에서도 섹션마다 다른 전략을 섞을 수 있습니다.
            아래 표는 단일 화면 또는 단일 섹션 단위의 매칭이며, 실제 페이지는 보통
            여러 행을 조합한 하이브리드 형태가 됩니다.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {RECOMMENDATIONS.map((r) => (
              <article
                key={r.screen}
                className="rounded-2xl border border-stone-300/80 bg-white/5 p-5"
              >
                <p className="eyebrow">{r.screen}</p>
                <p className="mt-2 text-xs text-stone-500">{r.detail}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass(r.tone)}`}
                  >
                    {r.pick}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  {r.reason}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────
           ACT 5: 운영하며 배운 것
           ────────────────────────────────────── */}
        <div id="toc-act5" className="scroll-mt-20">
          <StoryTransition tone="evidence">
            <span className="font-semibold text-stone-950">
              Act 5. 책상에서만 맞는 결론은 못 믿는다.
            </span>{" "}
            이 대시보드를 만드는 도중 staging에서 실제로 사고 2건을 겪었고, 원인
            규명 · 수정 · 배포 검증까지 전부 남겼다.
          </StoryTransition>
        </div>

        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Operations Incidents</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            측정 중 실제로 겪은 사고 2건
          </h2>
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
        </section>

        {/* ──────────────────────────────────────
           APPENDIX — 모든 raw 데이터
           ────────────────────────────────────── */}
        <div
          id="toc-appendix"
          className="mt-4 border-t border-stone-300/80 pt-2 text-center scroll-mt-20"
        >
          <p className="eyebrow">Appendix · Raw Data</p>
          <p className="mt-1 text-xs text-stone-500">
            위에서 요약한 모든 수치의 원본 데이터. 빠짐없이 기록합니다.
          </p>
        </div>

        <LighthouseFullTable />

        <BrowserTimingTable />

        <section className="glass-card overflow-x-auto rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Appendix · Trade-off Matrix</p>
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

        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <p className="eyebrow">Appendix · Cost</p>
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
          <p className="mt-3 rounded-2xl border border-stone-300/80 bg-white/5 px-4 py-3 text-xs leading-6 text-stone-700">
            <span className="font-semibold text-stone-950">왜 이 표가 의미 있는가:</span>{" "}
            이 글이 검증한 trade-off는 결국 *비용 축*에서 만나집니다.
            CSR이 절약한다는 월 $22는 ECS task 1개의 단가이고,
            Redis 공유 캐시($16)는 그 절감분 안에서 회수되며,
            동시에 origin API 호출을 사용자 100만 명 → TTL당 1회로 줄입니다.
            즉 &ldquo;프론트 캐시는 자원 낭비&rdquo;라는 직관과 정반대로,
            <span className="font-semibold text-emerald-800"> 같은 비용에서 더 나은 결과</span>로 이어집니다.
          </p>
        </section>

        <GlossaryCard />

        <ReproducibleBlock />

        <div id="toc-cta" className="scroll-mt-20">
          <FinalCta />
        </div>

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
      </div>
    </main>
  );
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  const valueColor = tone === "good" ? "text-emerald-800" : "text-rose-900";
  return (
    <li className="rounded-2xl border border-stone-300/80 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className={`metric-number mt-2 text-2xl font-semibold ${valueColor}`}>
        {value}
      </p>
    </li>
  );
}
