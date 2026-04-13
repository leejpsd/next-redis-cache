import { getLiveRandomUser } from "@/app/lib/getRandomUser";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import { ExperimentSnapshot } from "../components/ExperimentSnapshot";

export default async function SsrExperimentPage() {
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
