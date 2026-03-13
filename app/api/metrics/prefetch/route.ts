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
  const mode = body.mode;
  const latencyMs = body.latencyMs;

  if (typeof mode !== "string" || !isPrefetchMode(mode) || typeof latencyMs !== "number") {
    return NextResponse.json(
      {
        status: "bad_request",
        message: "mode(auto|true|false) and latencyMs(number) are required",
      },
      { status: 400 },
    );
  }

  observePrefetchTransition(mode, latencyMs);

  return NextResponse.json({
    status: "ok",
    mode,
    latencyMs,
    metrics: getMetricSnapshot(),
  });
}
