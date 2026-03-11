import { beforeEach, describe, expect, it, vi } from "vitest";

type RedisClientMock = {
  isOpen: boolean;
  on: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  sAdd: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  mGet: ReturnType<typeof vi.fn>;
  sMembers: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
};

function makeRedisClientMock(): RedisClientMock {
  return {
    isOpen: false,
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    sAdd: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    mGet: vi.fn().mockResolvedValue([]),
    sMembers: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue("PONG"),
  };
}

let redisClientMock = makeRedisClientMock();

vi.mock("redis", () => ({
  createClient: vi.fn(() => redisClientMock),
}));

async function loadHandler() {
  const mod = await import("./redis-handler");
  const moduleAny = mod as unknown as Record<string, unknown>;
  return (moduleAny.default ?? moduleAny) as {
    set: (cacheKey: string, pendingEntry: Promise<unknown>) => Promise<void>;
    getExpiration: (tags: string[]) => Promise<number>;
    updateTags: (
      tags: string[],
      durations?: {
        expire?: number;
      }
    ) => Promise<void>;
  };
}

function makeStream(content: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(content);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("redis-handler", () => {
  beforeEach(() => {
    vi.resetModules();
    redisClientMock = makeRedisClientMock();
    process.env.REDIS_URL = "redis://localhost:6379";
  });

  it("set(): expire가 0이면 revalidate를 ttl로 사용한다", async () => {
    const handler = await loadHandler();

    await handler.set(
      "cache-key-1",
      Promise.resolve({
        value: makeStream("hello"),
        tags: ["random-user"],
        stale: 30,
        timestamp: 1_700_000_000_000,
        expire: 0,
        revalidate: 120,
      })
    );

    expect(redisClientMock.set).toHaveBeenCalledWith(
      "next-cache:entry:cache-key-1",
      expect.any(String),
      { EX: 120 }
    );
    expect(redisClientMock.sAdd).toHaveBeenCalledWith(
      "next-cache:tag:random-user",
      "next-cache:entry:cache-key-1"
    );
    expect(redisClientMock.expire).toHaveBeenCalledWith(
      "next-cache:tag:random-user",
      120
    );
  });

  it("getExpiration(): 여러 태그 만료 시각 중 최대값을 반환한다", async () => {
    redisClientMock.mGet.mockResolvedValue(["1700000001000", null, "1700000004000"]);
    const handler = await loadHandler();

    const maxExpiration = await handler.getExpiration(["a", "b", "c"]);

    expect(redisClientMock.mGet).toHaveBeenCalledWith([
      "next-cache:tag-expiration:a",
      "next-cache:tag-expiration:b",
      "next-cache:tag-expiration:c",
    ]);
    expect(maxExpiration).toBe(1_700_000_004_000);
  });

  it("updateTags(): soft stale이면 태그 만료시각만 기록하고 삭제하지 않는다", async () => {
    const handler = await loadHandler();

    await handler.updateTags(["random-user"], { expire: 60 });

    expect(redisClientMock.set).toHaveBeenCalledWith(
      "next-cache:tag-expiration:random-user",
      expect.any(String)
    );
    expect(redisClientMock.sMembers).not.toHaveBeenCalled();
    expect(redisClientMock.del).not.toHaveBeenCalledWith("next-cache:tag:random-user");
  });

  it("updateTags(): hard expire이면 엔트리와 태그를 즉시 삭제한다", async () => {
    redisClientMock.sMembers.mockResolvedValue([
      "next-cache:entry:cache-a",
      "next-cache:entry:cache-b",
    ]);
    const handler = await loadHandler();

    await handler.updateTags(["random-user"], { expire: 0 });

    expect(redisClientMock.set).toHaveBeenCalledWith(
      "next-cache:tag-expiration:random-user",
      expect.any(String)
    );
    expect(redisClientMock.sMembers).toHaveBeenCalledWith(
      "next-cache:tag:random-user"
    );
    expect(redisClientMock.del).toHaveBeenCalledWith([
      "next-cache:entry:cache-a",
      "next-cache:entry:cache-b",
    ]);
    expect(redisClientMock.del).toHaveBeenCalledWith("next-cache:tag:random-user");
  });
});
