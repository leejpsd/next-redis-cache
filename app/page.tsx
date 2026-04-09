// app/page.tsx
import { Suspense } from "react";
import { CacheControls } from "./components/CacheControls";
import LiveUserProfile from "./components/LiveUserProfile";
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
                검증합니다. 왼쪽 카드는 원본 API를 매번 다시 호출하는 no-store
                기준선이고, 오른쪽 카드는 Redis shared cache가 적용된 카드입니다.
                soft revalidate와 hard invalidate의 차이도 같은 화면에서 바로
                비교할 수 있습니다.
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

            <div className="metric-card equal-card rounded-[1.75rem] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Experiment Focus
                  </p>
                  <p className="mt-2 max-w-md text-sm font-medium leading-6 text-stone-900">
                    왼쪽은 항상 바뀌는 기준선, 오른쪽은 유지되어야 하는 shared cache
                    결과입니다.
                  </p>
                </div>
                <span className="rounded-full border border-stone-300/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700">
                  compare
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-amber-700/15 bg-amber-50/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                    Soft Revalidate
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-700">
                    즉시 바뀌기보다, 잠시 뒤 새 값으로 전환되는 흐름이 정상입니다.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-700/15 bg-rose-50/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-800">
                    Hard Invalidate
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-700">
                    다음 요청에서 바로 다른 값이 보여야 합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <CacheControls lastUpdatedAt={fetchedAt} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-stretch">
          <Suspense fallback={<SkeletonCard />}>
            <LiveUserProfile />
          </Suspense>
          <Suspense fallback={<SkeletonCard />}>
            <UserProfile />
          </Suspense>
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
