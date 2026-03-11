import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "redis";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function sign({ topic, timestamp, webhookId, body, secret }) {
  const payload = `${timestamp}.${topic}.${webhookId}.${body}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function main() {
  const baseUrl = required("APP_BASE_URL");
  const redisUrl = required("REDIS_URL");
  const revalidationSecret = required("REVALIDATION_SECRET");
  const signingSecret = required("WEBHOOK_SIGNING_SECRET");

  const redis = createClient({ url: redisUrl });
  await redis.connect();

  try {
    await redis.flushDb();

    // 1) 첫 조회
    const firstPage = await fetch(baseUrl);
    if (!firstPage.ok) {
      throw new Error(`First page request failed: ${firstPage.status}`);
    }

    // 2) 웹훅 무효화
    const topic = "random-user/create";
    const timestamp = String(Date.now());
    const webhookId = randomUUID();
    const body = JSON.stringify({ source: "e2e-webhook-flow" });
    const signature = sign({
      topic,
      timestamp,
      webhookId,
      body,
      secret: signingSecret,
    });

    const webhookUrl = new URL("/api/revalidate", baseUrl);
    webhookUrl.searchParams.set("secret", revalidationSecret);
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        topic,
        "x-webhook-timestamp": timestamp,
        "x-webhook-id": webhookId,
        "x-webhook-signature": signature,
      },
      body,
    });

    if (webhookRes.status !== 202) {
      const payload = await webhookRes.text();
      throw new Error(`Webhook invalidation failed: ${webhookRes.status} ${payload}`);
    }

    // 3) 재조회
    const secondPage = await fetch(baseUrl);
    if (!secondPage.ok) {
      throw new Error(`Second page request failed: ${secondPage.status}`);
    }

    const nonceKeys = await redis.keys("revalidate:nonce:*");
    if (nonceKeys.length < 1) {
      throw new Error("Expected at least one nonce key after webhook call");
    }

    const cacheKeys = await redis.keys("next-cache:*");
    console.log(
      JSON.stringify(
        {
          ok: true,
          firstPageStatus: firstPage.status,
          webhookStatus: webhookRes.status,
          secondPageStatus: secondPage.status,
          nonceKeys: nonceKeys.length,
          nextCacheKeys: cacheKeys.length,
        },
        null,
        2
      )
    );
  } finally {
    await redis.quit();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

