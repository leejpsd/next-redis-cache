import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { getMetricSnapshot, observeConsistencyMismatch } from "@/lib/metrics";

vi.mock("@/lib/metrics", () => ({
  getMetricSnapshot: vi.fn(() => ({
    counters: {
      "revalidate.accepted": 0,
      "revalidate.rejected": 0,
      "revalidate.error": 0,
      "consistency.check": 1,
      "consistency.mismatch": 1,
    },
    invalidationLatency: {
      count: 0,
      sumMs: 0,
      avgMs: 0,
      maxMs: 0,
    },
    consistencyMismatchRate: {
      checks: 1,
      mismatches: 1,
      ratePct: 100,
    },
  })),
  observeConsistencyMismatch: vi.fn(),
}));

function makeRequest(payload: unknown) {
  const req = new Request("http://localhost:3000/api/metrics/consistency", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return new NextRequest(req);
}

describe("POST /api/metrics/consistency", () => {
  it("mismatch true를 보고하면 observeConsistencyMismatch(true)를 호출한다", async () => {
    const res = await POST(makeRequest({ mismatch: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(observeConsistencyMismatch).toHaveBeenCalledWith(true);
    expect(json.status).toBe("ok");
    expect(getMetricSnapshot).toHaveBeenCalled();
  });

  it("mismatch가 없으면 false로 처리한다", async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(observeConsistencyMismatch).toHaveBeenCalledWith(false);
    expect(json.mismatch).toBe(false);
  });
});

