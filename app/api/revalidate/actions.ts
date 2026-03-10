import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getRedisClient } from "@/lib/redis-client";
import {
  isTimestampWithinSkew,
  verifyWebhookSignature,
} from "@/lib/webhook-signature";

const PRODUCT_WEBHOOKS = [
  "random-user/create",
  "random-user/delete",
  "random-user/update",
];

async function isRateLimitExceeded(ip: string): Promise<boolean> {
  const currentWindow = Math.floor(Date.now() / 1000 / 60);
  const key = `revalidate:ratelimit:${ip}:${currentWindow}`;

  const redis = await getRedisClient();
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 70);
  }

  return count > env.REVALIDATE_RATE_LIMIT_PER_MINUTE;
}

async function registerWebhookNonce(webhookId: string): Promise<boolean> {
  if (!webhookId) return false;

  const key = `revalidate:nonce:${webhookId}`;
  const redis = await getRedisClient();
  const inserted = await redis.set(key, "1", {
    NX: true,
    EX: env.WEBHOOK_NONCE_TTL_SECONDS,
  });

  return inserted === "OK";
}

export async function handleWebhook(req: NextRequest): Promise<NextResponse> {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

  try {
    if (await isRateLimitExceeded(ip)) {
      return NextResponse.json(
        { status: 429, reason: "too many requests" },
        { status: 429 }
      );
    }
  } catch (error) {
    console.error("[revalidate] rate-limit check failed:", error);
    return NextResponse.json(
      { status: 503, reason: "rate-limit unavailable" },
      { status: 503 }
    );
  }

  const topic = req.headers.get("topic") || "unknown";
  const secret = req.nextUrl.searchParams.get("secret");
  const timestamp = req.headers.get("x-webhook-timestamp") || "";
  const webhookId = req.headers.get("x-webhook-id") || "";
  const signature = req.headers.get("x-webhook-signature") || "";
  const body = await req.text();
  const isProductUpdate = PRODUCT_WEBHOOKS.includes(topic);

  if (!secret || secret !== env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { status: 401, reason: "invalid secret" },
      { status: 401 }
    );
  }

  if (!isProductUpdate) {
    return NextResponse.json(
      {
        status: 400,
        reason: "not product topic",
      },
      { status: 400 }
    );
  }

  if (!isTimestampWithinSkew(timestamp, env.WEBHOOK_MAX_SKEW_SECONDS)) {
    return NextResponse.json(
      { status: 401, reason: "invalid timestamp" },
      { status: 401 }
    );
  }

  if (!webhookId) {
    return NextResponse.json(
      { status: 401, reason: "invalid webhook id" },
      { status: 401 }
    );
  }

  const isValidSignature = verifyWebhookSignature({
    topic,
    timestamp,
    webhookId,
    body,
    signature,
    secret: env.WEBHOOK_SIGNING_SECRET,
  });

  if (!isValidSignature) {
    return NextResponse.json(
      { status: 401, reason: "invalid signature" },
      { status: 401 }
    );
  }

  try {
    const isNonceAccepted = await registerWebhookNonce(webhookId);
    if (!isNonceAccepted) {
      return NextResponse.json(
        { status: 401, reason: "replayed webhook id" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("[revalidate] nonce registration failed:", error);
    return NextResponse.json(
      { status: 503, reason: "nonce store unavailable" },
      { status: 503 }
    );
  }

  revalidateTag("random-user", { expire: 0 });

  console.log("캐시 무효화 완료 (random-user)");

  return NextResponse.json(
    {
      status: 202,
      revalidated: true,
      tag: "random-user",
      now: Date.now(),
    },
    { status: 202 }
  );
}
