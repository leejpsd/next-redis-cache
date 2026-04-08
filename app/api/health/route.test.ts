import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { checkRedisPing } from "@/redis-handler";
import { getRuntimeIdentity } from "@/lib/runtime-context";

vi.mock("@/redis-handler", () => ({
  checkRedisPing: vi.fn(),
}));

vi.mock("@/lib/runtime-context", () => ({
  getRuntimeIdentity: vi.fn(),
}));

describe("GET /api/health", () => {
  it("redis 정상 시 200 ok 반환", async () => {
    vi.mocked(checkRedisPing).mockResolvedValue({ ok: true, latencyMs: 12 });
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
    expect(json.runtime.instanceId).toBe("task-a");
  });

  it("redis 비정상 시 503 degraded 반환", async () => {
    vi.mocked(checkRedisPing).mockResolvedValue({ ok: false, latencyMs: 2001 });
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
    expect(json.runtime.instanceId).toBe("task-b");
  });
});
