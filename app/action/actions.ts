"use server";

import { revalidateTag } from "next/cache";
import { env } from "@/lib/env";

export async function invalidateRandomUser() {
  // 그리고 캐시 무효화
  revalidateTag("random-user", "max");
}

export async function postRandomUser() {
  const endpoint = new URL("/api/revalidate", env.APP_BASE_URL);
  endpoint.searchParams.set("secret", env.REVALIDATION_SECRET);

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const data = await fetch(endpoint, {
        method: "POST",
        headers: {
          topic: "random-user/create",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!data.ok) {
        // 4xx는 재시도해도 효과가 없으므로 바로 실패 처리
        if (data.status < 500 || attempt === maxAttempts) {
          throw new Error(`Webhook invalidation failed with status ${data.status}`);
        }
      } else {
        const res = await data.json();
        console.log("webhook response", res);
        return res;
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
    }

    // 단순 exponential backoff
    await new Promise((resolve) => setTimeout(resolve, attempt * 200));
  }

  throw new Error("Webhook invalidation failed after retries.");
}
