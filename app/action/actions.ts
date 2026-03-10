"use server";

import { revalidateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { createWebhookSignature } from "@/lib/webhook-signature";

export async function invalidateRandomUser() {
  // 그리고 캐시 무효화
  revalidateTag("random-user", "max");
}

export async function postRandomUser() {
  const endpoint = new URL("/api/revalidate", env.APP_BASE_URL);
  endpoint.searchParams.set("secret", env.REVALIDATION_SECRET);
  const body = JSON.stringify({ source: "cache-controls" });
  const topic = "random-user/create";
  const timestamp = Date.now().toString();
  const webhookId = randomUUID();
  const signature = createWebhookSignature({
    topic,
    timestamp,
    webhookId,
    body,
    secret: env.WEBHOOK_SIGNING_SECRET,
  });

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const data = await fetch(endpoint, {
        method: "POST",
        headers: {
          topic,
          "content-type": "application/json",
          "x-webhook-timestamp": timestamp,
          "x-webhook-id": webhookId,
          "x-webhook-signature": signature,
        },
        body,
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
