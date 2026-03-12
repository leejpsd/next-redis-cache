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
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Redis Cache Demo
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900/70 border border-slate-800 mr-1">
                use cache
              </span>
              +{" "}
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900/70 border border-slate-800">
                cacheHandlers (Redis)
              </span>{" "}
              <br />
              로 randomuser.me 응답을 서버 사이드에서 캐싱합니다.
              <br />
              <br />
              새로고침을 해도 같은 유저가 나오는지 확인해보세요.
            </p>
          </div>

          <CacheControls lastUpdatedAt={fetchedAt} />
        </header>

        <Suspense fallback={<SkeletonCard />}>
          <UserProfile />
        </Suspense>

        <PrefetchLab />

        <MetricsPanel />
      </div>
    </main>
  );
}

function SkeletonCard() {
  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-950/50 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-24 h-24 rounded-full bg-slate-800" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 rounded bg-slate-800" />
          <div className="h-4 w-28 rounded bg-slate-800" />
          <div className="h-3 w-full max-w-xs rounded bg-slate-800" />
          <div className="h-3 w-40 rounded bg-slate-800" />
        </div>
      </div>
    </section>
  );
}
