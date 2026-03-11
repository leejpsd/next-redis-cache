import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredValue = {
  value: string;
  ex?: number;
};

type RedisMock = {
  isOpen: boolean;
  on: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  sAdd: ReturnType<typeof vi.fn>;
  sMembers: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  mGet: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
};

function createMemoryRedisMock(): RedisMock {
  const kv = new Map<string, StoredValue>();
  const sets = new Map<string, Set<string>>();

  const get = vi.fn(async (key: string) => kv.get(key)?.value ?? null);
  const set = vi.fn(
    async (
      key: string,
      value: string,
      options?: {
        EX?: number;
      }
    ) => {
      kv.set(key, { value, ex: options?.EX });
      return "OK";
    }
  );
  const del = vi.fn(async (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    let deleted = 0;
    for (const key of list) {
      if (kv.delete(key)) deleted += 1;
      if (sets.delete(key)) deleted += 1;
    }
    return deleted;
  });
  const sAdd = vi.fn(async (key: string, member: string) => {
    const setRef = sets.get(key) ?? new Set<string>();
    const before = setRef.size;
    setRef.add(member);
    sets.set(key, setRef);
    return setRef.size > before ? 1 : 0;
  });
  const sMembers = vi.fn(async (key: string) => Array.from(sets.get(key) ?? []));
  const expire = vi.fn(async (...args: [string, number]) => {
    void args;
    return 1;
  });
  const mGet = vi.fn(async (keys: string[]) => keys.map((key) => kv.get(key)?.value ?? null));
  const ping = vi.fn(async () => "PONG");

  return {
    isOpen: false,
    on: vi.fn(),
    connect: vi.fn(async () => undefined),
    get,
    set,
    del,
    sAdd,
    sMembers,
    expire,
    mGet,
    ping,
  };
}

let redisMock = createMemoryRedisMock();

vi.mock("redis", () => ({
  createClient: vi.fn(() => redisMock),
}));

async function loadHandler() {
  const mod = await import("./redis-handler");
  const moduleAny = mod as unknown as Record<string, unknown>;
  return (moduleAny.default ?? moduleAny) as {
    set: (cacheKey: string, pendingEntry: Promise<unknown>) => Promise<void>;
    get: (
      cacheKey: string,
      softTags?: string[]
    ) => Promise<
      | {
          value: ReadableStream<Uint8Array>;
          tags: string[];
          stale: number;
          timestamp: number;
          expire: number;
          revalidate: number;
        }
      | undefined
    >;
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

describe("redis-handler integration", () => {
  beforeEach(() => {
    vi.resetModules();
    redisMock = createMemoryRedisMock();
    process.env.REDIS_URL = "redis://localhost:6379";
  });

  it("캐시 hit/miss/invalidation 라이프사이클을 충족한다", async () => {
    const handler = await loadHandler();

    // miss (초기 상태)
    const missBefore = await handler.get("random-key", ["random-user"]);
    expect(missBefore).toBeUndefined();

    // set 후 hit
    await handler.set(
      "random-key",
      Promise.resolve({
        value: makeStream("cached-content"),
        tags: ["random-user"],
        stale: 30,
        timestamp: Date.now(),
        expire: 0,
        revalidate: 300,
      })
    );

    const hit = await handler.get("random-key", ["random-user"]);
    expect(hit).toBeDefined();
    expect(hit?.tags).toEqual(["random-user"]);

    // soft invalidation: 엔트리는 남고 태그 만료 시각만 갱신
    await handler.updateTags(["random-user"], { expire: 60 });
    const softExpiration = await handler.getExpiration(["random-user"]);
    expect(softExpiration).toBeGreaterThan(0);
    const hitAfterSoft = await handler.get("random-key", ["random-user"]);
    expect(hitAfterSoft).toBeDefined();

    // hard invalidation: 엔트리 즉시 삭제
    await handler.updateTags(["random-user"], { expire: 0 });
    const missAfterHard = await handler.get("random-key", ["random-user"]);
    expect(missAfterHard).toBeUndefined();
  });
});
