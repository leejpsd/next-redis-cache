import { getInstanceCachedRandomUser } from "../lib/getRandomUser";
import { UserSnapshotCard } from "./UserSnapshotCard";

export default async function InstanceCachedUserProfile() {
  const data = await getInstanceCachedRandomUser();

  return (
    <UserSnapshotCard
      eyebrow="Before"
      title="Per-instance cached user"
      description="이 카드는 일반적인 fetch revalidate/tags 경로가 멀티 인스턴스에서 인스턴스별 캐시로 갈라질 수 있는 잘못된 상황을 재현합니다. 같은 페이지여도 task마다 다른 유저가 보일 수 있습니다."
      refreshLabel="새로고침을 반복하면 인스턴스 수만큼 유저가 갈라질 수 있습니다."
      refreshHint="현재 task가 둘이기 때문에, 새로고침을 반복하면 두 유저가 번갈아 보이는 것이 정상입니다."
      badge="before"
      badgeTone="stone"
      data={data}
      payloadId="instance-random-user-payload"
    />
  );
}
