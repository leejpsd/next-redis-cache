import { Suspense } from "react";
import { connection } from "next/server";
import { ClientFetchedRandomUserClient } from "../components/ClientFetchedRandomUserClient";

export default function BffExperimentPage() {
  return (
    <Suspense fallback={<ExperimentPageFallback title="Client via BFF" />}>
      <BffExperimentContent />
    </Suspense>
  );
}

async function BffExperimentContent() {
  await connection();

  return (
    <ClientFetchedRandomUserClient
      eyebrow="Experiment / BFF"
      title="Client via BFF"
      description="브라우저는 내부 BFF 엔드포인트만 호출하고, 프론트 서버가 외부 origin을 대신 호출합니다. 보안과 응답 shape 제어는 쉬워지지만, 프론트 서버가 네트워크 중계 비용을 떠안습니다."
      strategySummary="이 경로는 '브라우저 직접 호출'과 '프론트 서버 경유' 사이의 trade-off를 보는 용도입니다. 이후 direct client call과 함께 응답시간, origin 호출 수, 운영 복잡도를 비교하게 됩니다."
      endpoint="/api/bff/random-user"
      mode="bff"
    />
  );
}

function ExperimentPageFallback({ title }: { title: string }) {
  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="glass-card rounded-[2rem] px-6 py-12 text-center sm:px-7">
          <p className="eyebrow">Experiment / BFF</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            브라우저와 BFF 경유 실험 화면을 준비하는 중입니다.
          </p>
        </section>
      </div>
    </main>
  );
}
