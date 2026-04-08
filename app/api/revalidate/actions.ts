import { revalidateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getRedisClient } from "@/lib/redis-client";
import { incMetric, observeInvalidationLatency } from "@/lib/metrics";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import {
  isTimestampWithinSkew,
  verifyWebhookSignature,
} from "@/lib/webhook-signature";

const PRODUCT_WEBHOOKS = [
  "random-user/create",
  "random-user/delete",
  "random-user/update",
];

function logRevalidateEvent(
  requestId: string,
  event: string,
  detail?: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      requestId,
      event,
      ...detail,
      at: new Date().toISOString(),
    })
  );
}

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
  const start = Date.now();
  const requestId = req.headers.get("x-request-id") || randomUUID();
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

  try {
    if (await isRateLimitExceeded(ip)) {
      logRevalidateEvent(requestId, "revalidate.rejected", {
        reason: "too_many_requests",
        ip,
      });
      incMetric("revalidate.rejected");
      return NextResponse.json(
        { status: 429, reason: "too many requests", requestId },
        { status: 429 }
      );
    }
  } catch (error) {
    logRevalidateEvent(requestId, "revalidate.error", {
      reason: "rate_limit_unavailable",
      error: error instanceof Error ? error.message : String(error),
    });
    incMetric("revalidate.error");
    return NextResponse.json(
      { status: 503, reason: "rate-limit unavailable", requestId },
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
    logRevalidateEvent(requestId, "revalidate.rejected", {
      reason: "invalid_secret",
      ip,
      topic,
    });
    incMetric("revalidate.rejected");
    return NextResponse.json(
      { status: 401, reason: "invalid secret", requestId },
      { status: 401 }
    );
  }

  if (!isProductUpdate) {
    logRevalidateEvent(requestId, "revalidate.rejected", {
      reason: "not_product_topic",
      topic,
    });
    incMetric("revalidate.rejected");
    return NextResponse.json(
      {
        status: 400,
        reason: "not product topic",
        requestId,
      },
      { status: 400 }
    );
  }

  if (!isTimestampWithinSkew(timestamp, env.WEBHOOK_MAX_SKEW_SECONDS)) {
    logRevalidateEvent(requestId, "revalidate.rejected", {
      reason: "invalid_timestamp",
      topic,
      timestamp,
    });
    incMetric("revalidate.rejected");
    return NextResponse.json(
      { status: 401, reason: "invalid timestamp", requestId },
      { status: 401 }
    );
  }

  if (!webhookId) {
    logRevalidateEvent(requestId, "revalidate.rejected", {
      reason: "invalid_webhook_id",
      topic,
    });
    incMetric("revalidate.rejected");
    return NextResponse.json(
      { status: 401, reason: "invalid webhook id", requestId },
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
    logRevalidateEvent(requestId, "revalidate.rejected", {
      reason: "invalid_signature",
      topic,
      webhookId,
    });
    incMetric("revalidate.rejected");
    return NextResponse.json(
      { status: 401, reason: "invalid signature", requestId },
      { status: 401 }
    );
  }

  try {
    const isNonceAccepted = await registerWebhookNonce(webhookId);
    if (!isNonceAccepted) {
      logRevalidateEvent(requestId, "revalidate.rejected", {
        reason: "replayed_webhook_id",
        webhookId,
      });
      incMetric("revalidate.rejected");
      return NextResponse.json(
        { status: 401, reason: "replayed webhook id", requestId },
        { status: 401 }
      );
    }
  } catch (error) {
    logRevalidateEvent(requestId, "revalidate.error", {
      reason: "nonce_store_unavailable",
      error: error instanceof Error ? error.message : String(error),
      webhookId,
    });
    incMetric("revalidate.error");
    return NextResponse.json(
      { status: 503, reason: "nonce store unavailable", requestId },
      { status: 503 }
    );
  }

  const runtime = getRuntimeIdentity();
  revalidateTag("random-user", { expire: 0 });

  logRevalidateEvent(requestId, "revalidate.accepted", {
    tag: "random-user",
    topic,
    webhookId,
    runtime,
    startedAt: start,
    completedAt: Date.now(),
  });
  incMetric("revalidate.accepted");
  observeInvalidationLatency(Date.now() - start);

  return NextResponse.json(
    {
      status: 202,
      revalidated: true,
      tag: "random-user",
      requestId,
      now: Date.now(),
      runtime,
    },
    { status: 202 }
  );
}
