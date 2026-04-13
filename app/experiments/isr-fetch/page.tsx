import { getFetchRevalidatedSharedRandomUser } from "@/app/lib/getRandomUser";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import { ExperimentSnapshot } from "../components/ExperimentSnapshot";

export default async function IsrFetchExperimentPage() {
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
