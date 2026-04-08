import {
  getProbeWithFetchRevalidate,
  renderProbePage,
} from "@/app/lib/cacheProbe";
import { getRuntimeIdentity } from "@/lib/runtime-context";

export default async function FetchRevalidateOnlyPage() {
  const payload = await getProbeWithFetchRevalidate("fetch-revalidate-only");

  return renderProbePage(
    "fetch next.revalidate only",
    "`use cache` 없이 `fetch(..., { next: { revalidate: 60 } })`만 사용한 경로입니다.",
    payload,
    getRuntimeIdentity()
  );
}
