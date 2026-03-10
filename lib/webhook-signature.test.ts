import { describe, expect, it, vi } from "vitest";
import {
  createWebhookSignature,
  isTimestampWithinSkew,
  verifyWebhookSignature,
} from "./webhook-signature";

describe("webhook-signature", () => {
  const baseInput = {
    topic: "random-user/create",
    timestamp: "1700000000000",
    body: '{"source":"test"}',
    secret: "test-secret",
  };

  it("동일 입력에 대해 동일한 HMAC 서명을 생성한다", () => {
    const signatureA = createWebhookSignature(baseInput);
    const signatureB = createWebhookSignature(baseInput);

    expect(signatureA).toBe(signatureB);
    expect(signatureA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("서명이 유효하면 verifyWebhookSignature가 true를 반환한다", () => {
    const signature = createWebhookSignature(baseInput);

    const verified = verifyWebhookSignature({
      ...baseInput,
      signature,
    });

    expect(verified).toBe(true);
  });

  it("본문이 바뀌면 서명 검증에 실패한다", () => {
    const signature = createWebhookSignature(baseInput);

    const verified = verifyWebhookSignature({
      ...baseInput,
      body: '{"source":"tampered"}',
      signature,
    });

    expect(verified).toBe(false);
  });

  it("시크릿이 바뀌면 서명 검증에 실패한다", () => {
    const signature = createWebhookSignature(baseInput);

    const verified = verifyWebhookSignature({
      ...baseInput,
      secret: "wrong-secret",
      signature,
    });

    expect(verified).toBe(false);
  });

  it("허용 오차 내 timestamp는 유효하다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T06:00:00.000Z"));

    const now = Date.now();
    expect(isTimestampWithinSkew(String(now - 4_000), 5)).toBe(true);
    expect(isTimestampWithinSkew(String(now + 4_000), 5)).toBe(true);

    vi.useRealTimers();
  });

  it("허용 오차를 벗어난 timestamp는 무효다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T06:00:00.000Z"));

    const now = Date.now();
    expect(isTimestampWithinSkew(String(now - 6_000), 5)).toBe(false);
    expect(isTimestampWithinSkew(String(now + 6_000), 5)).toBe(false);
    expect(isTimestampWithinSkew("not-a-number", 5)).toBe(false);

    vi.useRealTimers();
  });
});
