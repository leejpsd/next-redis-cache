import { getRandomUser } from "@/app/lib/getRandomUser";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import { ExperimentSnapshot } from "../components/ExperimentSnapshot";

export default async function SharedCacheExperimentPage() {
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
