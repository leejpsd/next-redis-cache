import { getProbeWithUseCache, renderProbePage } from "@/app/lib/cacheProbe";
import { getRuntimeIdentity } from "@/lib/runtime-context";

export default async function UseCachePage() {
  const payload = await getProbeWithUseCache("use-cache");

  return renderProbePage(
    "use cache + cacheLife",
    "`use cache`와 `cacheLife('minutes')`를 함께 사용한 경로입니다.",
    payload,
    getRuntimeIdentity()
  );
}
