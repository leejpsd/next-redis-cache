import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { getMetricSnapshot, observePrefetchTransition } from "@/lib/metrics";

vi.mock("@/lib/metrics", () => ({
  getMetricSnapshot: vi.fn(() => ({
    counters: {
      "revalidate.accepted": 0,
      "revalidate.rejected": 0,
      "revalidate.error": 0,
      "consistency.check": 0,
      "consistency.mismatch": 0,
    },
    invalidationLatency: {
      count: 0,
      sumMs: 0,
      avgMs: 0,
      maxMs: 0,
    },
    consistencyMismatchRate: {
      checks: 0,
      mismatches: 0,
      ratePct: 0,
    },
    prefetchTransitionByMode: {
      auto: { count: 1, sumMs: 120, avgMs: 120, maxMs: 120 },
      true: { count: 0, sumMs: 0, avgMs: 0, maxMs: 0 },
      false: { count: 0, sumMs: 0, avgMs: 0, maxMs: 0 },
    },
  })),
  observePrefetchTransition: vi.fn(),
}));

function makeRequest(payload: unknown) {
  const req = new Request("http://localhost:3000/api/metrics/prefetch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return new NextRequest(req);
}

describe("POST /api/metrics/prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("유효 payload면 prefetch 메트릭을 기록한다", async () => {
    const res = await POST(makeRequest({ mode: "auto", latencyMs: 123 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(observePrefetchTransition).toHaveBeenCalledWith("auto", 123);
    expect(json.status).toBe("ok");
    expect(getMetricSnapshot).toHaveBeenCalled();
  });

  it("payload가 유효하지 않으면 400을 반환한다", async () => {
    const res = await POST(makeRequest({ mode: "invalid", latencyMs: "10" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.status).toBe("bad_request");
    expect(observePrefetchTransition).not.toHaveBeenCalled();
  });
});
