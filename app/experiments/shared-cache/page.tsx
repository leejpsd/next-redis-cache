import { Suspense } from "react";
import { getRandomUser } from "@/app/lib/getRandomUser";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import { connection } from "next/server";
import { ExperimentSnapshot } from "../components/ExperimentSnapshot";

export default function SharedCacheExperimentPage() {
  return (
    <Suspense fallback={<ExperimentPageFallback title="Shared cache with Cache Components" />}>
      <SharedCacheExperimentContent />
    </Suspense>
  );
}

async function SharedCacheExperimentContent() {
  await connection();
  const payload = await getRandomUser();

  return (
    <ExperimentSnapshot
      eyebrow="Experiment / Cache Components"
      title="Shared cache with Cache Components"
      description="`use cache`, `cacheLife`, `cacheTag`를 사용해 함수 결과를 재사용하고, 멀티 인스턴스 self-hosting에서는 Redis shared cache로 중앙화한 경로입니다."
      strategySummary="현재 프로젝트의 핵심 after 전략입니다. 멀티 인스턴스에서도 같은 캐시 엔트리를 공유해 before 상태의 불일치를 줄이고, invalidation도 중앙에서 일관되게 반영할 수 있습니다."
      payload={payload}
      renderer={getRuntimeIdentity()}
    />
  );
}

function ExperimentPageFallback({ title }: { title: string }) {
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="glass-card rounded-[2rem] px-6 py-12 text-center sm:px-7">
          <p className="eyebrow">Experiment / Cache Components</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            요청 시 캐시 결과를 준비하는 중입니다.
          </p>
        </section>
      </div>
    </main>
  );
}
