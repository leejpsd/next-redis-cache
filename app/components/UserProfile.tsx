import { getRandomUser } from "../lib/getRandomUser";
import { UserSnapshotCard } from "./UserSnapshotCard";

export default async function UserProfile() {
  const data = await getRandomUser();
  return (
    <UserSnapshotCard
      eyebrow="Shared Cache Result"
      title="Cached random user"
      description="메인 카드가 여러 ECS task에서 동일하게 보이면 메인 `random-user` 캐시가 Redis에 저장되어 중앙화된 상태입니다."
      badge="shared cache"
      badgeTone="emerald"
      data={data}
      payloadId="random-user-payload"
    />
  );
}
