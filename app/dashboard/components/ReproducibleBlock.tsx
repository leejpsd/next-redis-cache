/**
 * 대시보드 모든 수치를 재현하는 3가지 명령.
 * 심사자·독자가 "가정이 아니라 실측"임을 직접 확인하게 한다.
 */

const BLOCKS = [
  {
    title: "① 서버 응답 시간 (k6)",
    detail: "baseline · spike · soak 세 프로파일 모두 재실행.",
    script: `# staging 대상 부하 테스트
APP_BASE_URL=http://<your-alb>/ \\
  npm run test:load:baseline

# 스파이크 (3경로 × 30 VU × 5m)
APP_BASE_URL=http://<your-alb>/ \\
  k6 run scripts/k6-spike.js

# 장시간 (10 VU × 30m, shared-cache)
APP_BASE_URL=http://<your-alb>/ \\
  k6 run scripts/k6-soak.js`,
  },
  {
    title: "② 사용자 체감 (Lighthouse)",
    detail: "로컬 prod build 기준 모바일 4G · Slow 3G.",
    script: `# 로컬 서버 띄우기 (Redis 필요)
REDIS_URL=redis://localhost:6379 npm run build && \\
  REDIS_URL=redis://localhost:6379 npm start

# 모바일 4G (Core Web Vitals 전체)
APP_BASE_URL=http://localhost:3000 \\
  node scripts/measure-web-vitals.mjs

# Slow 3G
APP_BASE_URL=http://localhost:3000 \\
  node scripts/measure-web-vitals-slow3g.mjs`,
  },
  {
    title: "③ CSR origin 호출 · revalidateTag 전파",
    detail: "이 대시보드의 실측 카드 두 장을 재현.",
    script: `# CSR 세션당 origin 호출 수 (Playwright)
APP_BASE_URL=http://localhost:3000 SESSION_COUNT=10 \\
  node scripts/measure-origin-fetch-per-session.mjs

# revalidateTag 전파 (두 포트 띄워서 같은 Redis 공유)
PORT=3000 REDIS_URL=redis://localhost:6379 npm start &
PORT=3001 REDIS_URL=redis://localhost:6379 npm start &
TASK_A_URL=http://localhost:3000 TASK_B_URL=http://localhost:3001 \\
  node scripts/measure-revalidate-tag-propagation.mjs`,
  },
];

export function ReproducibleBlock() {
  return (
    <details className="glass-card group rounded-[2rem] px-6 py-5 sm:px-7 [&[open]>summary>svg]:rotate-180">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Reproducible</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-stone-950">
            이 대시보드의 모든 수치 재현하기
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            가정치가 아니라 실측이라는 걸 확인하고 싶다면, 아래 3가지 명령을
            순서대로 돌리면 같은 결과를 얻을 수 있습니다.
          </p>
        </div>
        <svg
          className="mt-1 h-5 w-5 shrink-0 text-stone-500 transition-transform"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="M5 7l5 6 5-6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {BLOCKS.map((b) => (
          <div
            key={b.title}
            className="rounded-xl border border-stone-300/80 bg-white/5 p-4"
          >
            <p className="text-sm font-semibold text-stone-950">{b.title}</p>
            <p className="mt-1 text-[11px] text-stone-500">{b.detail}</p>
            <pre className="mt-3 overflow-x-auto rounded bg-stone-900/5 px-3 py-2 text-[10px] leading-5 text-stone-100">
              {b.script}
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}
