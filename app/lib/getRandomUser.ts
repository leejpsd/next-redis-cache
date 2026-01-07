import { cacheTag } from "next/cache";

export async function getRandomUser() {
  "use cache";
  cacheTag("random-user");

  const res = await fetch("https://randomuser.me/api", {
    cache: "no-store", // ← fetch 레벨 캐시 비활성화
  });
  if (!res.ok) {
    throw new Error("Failed to fetch random user");
  }

  const fetchedAt = Date.now();

  return { ...(await res.json()), fetchedAt };
}
