import { Suspense } from "react";
import { connection } from "next/server";
import { getFetchRevalidatedSharedRandomUser } from "@/app/lib/getRandomUser";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import { ExperimentSnapshot } from "../components/ExperimentSnapshot";

export default function IsrFetchExperimentPage() {
  return (
    <Suspense fallback={<ExperimentPageFallback />}>
      <IsrFetchExperimentContent />
    </Suspense>
  );
}

async function IsrFetchExperimentContent() {
  // 빌드 시점에 randomuser.me에 의존하지 않도록 동적 렌더로 강제.
  // (외부 API 일시 장애가 staging 배포를 막던 문제 영구 차단)
  await connection();
  const payload = await getFetchRevalidatedSharedRandomUser();

  return (
    <ExperimentSnapshot
      eyebrow="Experiment / ISR(fetch)"
      title="Incremental cache via fetch revalidate"
      description="`use cache` 없이 `fetch(..., { next: { revalidate, tags } })`만으로 결과를 재사용하는 경로입니다. self-hosting에서는 이 계층이 incremental cache handler를 통해 공유 스토리지로 갈 수 있습니다."
      strategySummary="이 전략은 페이지 전체가 아니라 fetch 결과를 재사용합니다. 멀티 인스턴스에서 공유 스토리지를 붙이지 않으면 인스턴스별로 갈라질 수 있고, 붙이면 Redis 같은 저장소를 통해 공유될 수 있습니다."
      payload={payload}
      renderer={getRuntimeIdentity()}
    />
  );
}

function ExperimentPageFallback() {
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="glass-card rounded-[2rem] px-6 py-12 text-center sm:px-7">
          <p className="eyebrow">Experiment / ISR(fetch)</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
            Incremental cache via fetch revalidate
          </h1>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            첫 요청에서 fetch 결과를 가져오는 중입니다. 이후 60초간 캐시
            히트로 응답합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
