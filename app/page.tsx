// app/page.tsx
import { Suspense } from "react";
import { CacheControls } from "./components/CacheControls";
import { MetricsPanel } from "./components/MetricsPanel";
import { PrefetchLab } from "./components/PrefetchLab";
import UserProfile from "./components/UserProfile";
import { getRandomUser } from "./lib/getRandomUser";

export default async function Home() {
  const { fetchedAt } = await getRandomUser();
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-5">
        <section className="glass-card rounded-[2rem] px-6 py-6 sm:px-7">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-stretch">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="eyebrow">Next.js 16 Self Hosting Study</p>
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-stone-950 sm:text-[3rem] sm:leading-[1.02]">
                  멀티 인스턴스 Redis 캐시 실험
                </h1>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-stone-600 sm:text-[0.95rem]">
                ECS Fargate 여러 task에서 `random-user` 캐시가 동일하게 공유되는지
                검증합니다. soft revalidate와 hard invalidate의 차이도 같은 화면에서
                비교합니다.
              </p>

              <div className="flex flex-wrap gap-2 text-[0.72rem] font-medium text-stone-700">
                <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5">
                  2 tasks
                </span>
                <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5">
                  Redis cache
                </span>
                <span className="rounded-full border border-stone-300/80 bg-white/80 px-3 py-1.5">
                  soft / hard
                </span>
              </div>
            </div>

            <div className="metric-card equal-card rounded-[1.5rem] p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
                What to check
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
                <li>새로고침해도 동일한 유저가 유지되는지</li>
                <li>soft revalidate 뒤엔 조금 뒤 새 값이 보이는지</li>
                <li>hard invalidate 뒤엔 바로 새 값이 보이는지</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] xl:items-stretch">
          <Suspense fallback={<SkeletonCard />}>
            <UserProfile />
          </Suspense>
          <CacheControls lastUpdatedAt={fetchedAt} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2 xl:items-stretch">
          <MetricsPanel />
          <PrefetchLab />
        </section>
      </div>
    </main>
  );
}

function SkeletonCard() {
  return (
    <section className="glass-card animate-pulse rounded-[2rem] p-7">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-24 w-24 rounded-full bg-stone-200" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 rounded bg-stone-200" />
          <div className="h-4 w-28 rounded bg-stone-200" />
          <div className="h-3 w-full max-w-xs rounded bg-stone-200" />
          <div className="h-3 w-40 rounded bg-stone-200" />
        </div>
      </div>
    </section>
  );
}
