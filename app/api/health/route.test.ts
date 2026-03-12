import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { checkRedisPing } from "@/redis-handler";

vi.mock("@/redis-handler", () => ({
  checkRedisPing: vi.fn(),
}));

describe("GET /api/health", () => {
  it("redis 정상 시 200 ok 반환", async () => {
    vi.mocked(checkRedisPing).mockResolvedValue({ ok: true, latencyMs: 12 });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.checks.redis.ok).toBe(true);
  });

  it("redis 비정상 시 503 degraded 반환", async () => {
    vi.mocked(checkRedisPing).mockResolvedValue({ ok: false, latencyMs: 2001 });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe("degraded");
    expect(json.checks.redis.ok).toBe(false);
  });
});

