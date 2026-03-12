import { NextRequest, NextResponse } from "next/server";
import { getMetricSnapshot, observePrefetchTransition, type PrefetchMode } from "@/lib/metrics";

type PrefetchPayload = {
  mode?: string;
  latencyMs?: number;
};

function isPrefetchMode(mode: string): mode is PrefetchMode {
  return mode === "auto" || mode === "true" || mode === "false";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as PrefetchPayload;

  if (!isPrefetchMode(body.mode ?? "") || typeof body.latencyMs !== "number") {
    return NextResponse.json(
      {
        status: "bad_request",
        message: "mode(auto|true|false) and latencyMs(number) are required",
      },
      { status: 400 },
    );
  }

  observePrefetchTransition(body.mode, body.latencyMs);

  return NextResponse.json({
    status: "ok",
    mode: body.mode,
    latencyMs: body.latencyMs,
    metrics: getMetricSnapshot(),
  });
}
