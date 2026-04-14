import { Suspense } from "react";
import { getLiveRandomUser } from "@/app/lib/getRandomUser";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import { connection } from "next/server";
import { ExperimentSnapshot } from "../components/ExperimentSnapshot";

export default function SsrExperimentPage() {
  return (
    <Suspense fallback={<ExperimentPageFallback title="Request-time server rendering" />}>
      <SsrExperimentContent />
    </Suspense>
  );
}

async function SsrExperimentContent() {
  await connection();
  const payload = await getLiveRandomUser();

  return (
    <ExperimentSnapshot
      eyebrow="Experiment / SSR"
      title="Request-time server rendering"
      description="요청이 들어올 때마다 서버가 원본 데이터를 다시 가져와 렌더링합니다. 가장 직관적이지만 origin fetch 비용과 렌더 비용이 매 요청마다 발생합니다."
      strategySummary="항상 최신 데이터를 보여주기 쉽지만, 캐시 없이 매 요청마다 서버와 origin을 다시 사용합니다. 이후 ISR이나 shared cache가 이 비용을 얼마나 줄이는지 비교하는 기준이 됩니다."
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
          <p className="eyebrow">Experiment / SSR</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            요청 시 원본 데이터를 준비하는 중입니다.
          </p>
        </section>
      </div>
    </main>
  );
}
