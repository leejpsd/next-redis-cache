import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleWebhook } from "./actions";
import { revalidateTag } from "next/cache";
import { getRedisClient } from "@/lib/redis-client";
import { getRuntimeIdentity } from "@/lib/runtime-context";
import {
  isTimestampWithinSkew,
  verifyWebhookSignature,
} from "@/lib/webhook-signature";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    REVALIDATION_SECRET: "test-secret",
    WEBHOOK_SIGNING_SECRET: "test-signing-secret",
    REVALIDATE_RATE_LIMIT_PER_MINUTE: 30,
    WEBHOOK_MAX_SKEW_SECONDS: 300,
    REDIS_URL: "redis://localhost:6379",
    APP_BASE_URL: "http://localhost:3000",
    WEBHOOK_NONCE_TTL_SECONDS: 600,
  },
}));

vi.mock("@/lib/redis-client", () => ({
  getRedisClient: vi.fn(),
}));

vi.mock("@/lib/runtime-context", () => ({
  getRuntimeIdentity: vi.fn(),
}));

vi.mock("@/lib/webhook-signature", () => ({
  isTimestampWithinSkew: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}));

function makeRequest(options?: {
  secret?: string;
  topic?: string;
  timestamp?: string;
  webhookId?: string;
  signature?: string;
  body?: string;
  ip?: string;
}): NextRequest {
  const secret = options?.secret ?? "test-secret";
  const topic = options?.topic ?? "random-user/create";
  const timestamp = options?.timestamp ?? Date.now().toString();
  const webhookId = options?.webhookId ?? "evt_01test";
  const signature = options?.signature ?? "dummy-signature";
  const body = options?.body ?? '{"source":"test"}';
  const ip = options?.ip ?? "1.2.3.4";

  const url = `http://localhost:3000/api/revalidate?secret=${encodeURIComponent(secret)}`;
  const request = new Request(url, {
    method: "POST",
    headers: {
      topic,
      "content-type": "application/json",
      "x-webhook-timestamp": timestamp,
      "x-webhook-id": webhookId,
      "x-webhook-signature": signature,
      "x-forwarded-for": ip,
    },
    body,
  });

  return new NextRequest(request);
}

describe("POST /api/revalidate 보안 분기", () => {
  const incr = vi.fn();
  const expire = vi.fn();
  const set = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(getRedisClient).mockResolvedValue({
      incr,
      expire,
      set,
    } as unknown as Awaited<ReturnType<typeof getRedisClient>>);
    vi.mocked(getRuntimeIdentity).mockReturnValue({
      instanceId: "task-a",
      taskId: "task-a",
      hostname: "host-a",
      pid: 123,
      bootId: "boot-a",
      region: "ap-northeast-2",
      nodeEnv: "test",
    });

    incr.mockResolvedValue(1);
    expire.mockResolvedValue(1);
    set.mockResolvedValue("OK");
    vi.mocked(isTimestampWithinSkew).mockReturnValue(true);
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
  });

  it("rate limit 초과 시 429를 반환한다", async () => {
    incr.mockResolvedValue(31);

    const res = await handleWebhook(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.reason).toBe("too many requests");
  });

  it("secret 불일치 시 401을 반환한다", async () => {
    const res = await handleWebhook(makeRequest({ secret: "wrong-secret" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.reason).toBe("invalid secret");
  });

  it("허용되지 않은 topic이면 400을 반환한다", async () => {
    const res = await handleWebhook(makeRequest({ topic: "unknown/topic" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.reason).toBe("not product topic");
  });

  it("timestamp 검증 실패 시 401을 반환한다", async () => {
    vi.mocked(isTimestampWithinSkew).mockReturnValue(false);

    const res = await handleWebhook(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.reason).toBe("invalid timestamp");
  });

  it("signature 검증 실패 시 401을 반환한다", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);

    const res = await handleWebhook(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.reason).toBe("invalid signature");
  });

  it("webhook id가 누락되면 401을 반환한다", async () => {
    const res = await handleWebhook(makeRequest({ webhookId: "" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.reason).toBe("invalid webhook id");
  });

  it("동일 webhook id 재사용 시 401을 반환한다", async () => {
    set.mockResolvedValueOnce(null);

    const res = await handleWebhook(makeRequest({ webhookId: "evt_replay" }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.reason).toBe("replayed webhook id");
  });

  it("nonce 저장소 오류 시 503을 반환한다", async () => {
    set.mockRejectedValueOnce(new Error("redis down"));

    const res = await handleWebhook(makeRequest({ webhookId: "evt_store_down" }));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.reason).toBe("nonce store unavailable");
  });

  it("모든 검증 통과 시 202와 revalidateTag 호출", async () => {
    const res = await handleWebhook(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.revalidated).toBe(true);
    expect(json.runtime.instanceId).toBe("task-a");
    expect(revalidateTag).toHaveBeenCalledWith("random-user", { expire: 0 });
  });
});
