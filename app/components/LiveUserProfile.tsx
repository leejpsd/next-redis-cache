import { getLiveRandomUser } from "../lib/getRandomUser";
import { UserSnapshotCard } from "./UserSnapshotCard";

export default async function LiveUserProfile() {
  const data = await getLiveRandomUser();

  return (
    <UserSnapshotCard
      eyebrow="Uncached Baseline"
      title="Live random user"
      description="이 카드는 cache no-store로 요청해 매번 새로운 원본 응답을 받습니다. 캐시 적용 카드와 비교하기 위한 기준선입니다."
      refreshLabel="새로고침할 때마다 새로운 유저를 보는 것이 정상입니다."
      refreshHint="원본 API를 매번 다시 호출하므로 값이 계속 바뀌어야 합니다."
      badge="no-store"
      badgeTone="stone"
      data={data}
      payloadId="live-random-user-payload"
    />
  );
}
