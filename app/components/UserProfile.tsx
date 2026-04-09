import { getRandomUser } from "../lib/getRandomUser";
import { UserSnapshotCard } from "./UserSnapshotCard";

export default async function UserProfile() {
  const data = await getRandomUser();
  return (
    <UserSnapshotCard
      eyebrow="Shared Cache Result"
      title="Cached random user"
      description="메인 카드가 여러 ECS task에서 동일하게 보이면 메인 `random-user` 캐시가 Redis에 저장되어 중앙화된 상태입니다."
      refreshLabel="새로고침을 여러 번 해도 같은 유저가 유지되어야 합니다."
      refreshHint="Redis shared cache를 통해 여러 인스턴스가 같은 캐시 엔트리를 보게 되는 after 상태입니다."
      badge="shared cache"
      badgeTone="emerald"
      data={data}
      payloadId="random-user-payload"
    />
  );
}
