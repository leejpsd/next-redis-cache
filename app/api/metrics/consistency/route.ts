import { NextRequest, NextResponse } from "next/server";
import { getMetricSnapshot, observeConsistencyMismatch } from "@/lib/metrics";

type ConsistencyPayload = {
  mismatch?: boolean;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as ConsistencyPayload;
  const mismatch = body.mismatch === true;

  observeConsistencyMismatch(mismatch);

  return NextResponse.json({
    status: "ok",
    mismatch,
    metrics: getMetricSnapshot(),
  });
}

