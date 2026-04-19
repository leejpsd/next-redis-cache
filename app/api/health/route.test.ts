import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { pingRedis } from "@/lib/redis-client";
import { getRuntimeIdentity } from "@/lib/runtime-context";

vi.mock("@/lib/redis-client", () => ({
  pingRedis: vi.fn(),
}));

vi.mock("@/lib/runtime-context", () => ({
  getRuntimeIdentity: vi.fn(),
}));

describe("GET /api/health", () => {
  it("redis 정상 시 200 ok 반환", async () => {
    vi.mocked(pingRedis).mockResolvedValue({ ok: true, latencyMs: 12 });
    vi.mocked(getRuntimeIdentity).mockReturnValue({
      instanceId: "task-a",
      taskId: "task-a",
      hostname: "host-a",
      pid: 123,
      bootId: "boot-a",
      region: "ap-northeast-2",
      nodeEnv: "test",
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.checks.redis.ok).toBe(true);
    expect(json.checks.redis.reason).toBeNull();
    expect(json.runtime.instanceId).toBe("task-a");
  });

  it("redis 비정상 시 503 degraded 반환 + reason 포함", async () => {
    vi.mocked(pingRedis).mockResolvedValue({
      ok: false,
      latencyMs: 2001,
      reason: "timeout",
    });
    vi.mocked(getRuntimeIdentity).mockReturnValue({
      instanceId: "task-b",
      taskId: "task-b",
      hostname: "host-b",
      pid: 456,
      bootId: "boot-b",
      region: "ap-northeast-2",
      nodeEnv: "test",
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe("degraded");
    expect(json.checks.redis.ok).toBe(false);
    expect(json.checks.redis.reason).toBe("timeout");
    expect(json.runtime.instanceId).toBe("task-b");
  });

  it("메모리 fallback 모드에선 reason=fallback과 함께 ok 반환", async () => {
    vi.mocked(pingRedis).mockResolvedValue({
      ok: true,
      latencyMs: 0,
      reason: "fallback",
    });
    vi.mocked(getRuntimeIdentity).mockReturnValue({
      instanceId: "task-c",
      taskId: "task-c",
      hostname: "host-c",
      pid: 789,
      bootId: "boot-c",
      region: "ap-northeast-2",
      nodeEnv: "test",
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.checks.redis.reason).toBe("fallback");
  });
});
