import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

describe("getRandomUser", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns origin payload when upstream succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        date: "Thu, 10 Apr 2026 00:00:00 GMT",
      }),
      json: async () => ({
        results: [
          {
            name: { title: "Ms", first: "Origin", last: "User" },
            location: {
              street: { number: 1, name: "Main" },
              city: "Seoul",
              country: "South Korea",
              timezone: { offset: "+09:00", description: "KST" },
              coordinates: { latitude: "1", longitude: "2" },
            },
            email: "origin@example.com",
            phone: "010-1111-1111",
            nat: "KR",
            dob: { date: "1990-01-01T00:00:00.000Z", age: 34 },
            registered: { date: "2024-01-01T00:00:00.000Z", age: 1 },
            picture: { large: "https://randomuser.me/api/portraits/lego/2.jpg" },
          },
        ],
      }),
    }) as typeof fetch;

    const { getRandomUser } = await import("./getRandomUser");
    const payload = await getRandomUser();

    expect(payload.source).toBe("origin");
    expect(payload.results[0]?.email).toBe("origin@example.com");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries and falls back when upstream keeps failing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as typeof fetch;

    const { getRandomUser } = await import("./getRandomUser");
    const payload = await getRandomUser();

    expect(payload.source).toBe("fallback");
    expect(payload.results[0]?.email).toBe("cache-fallback@example.com");
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
