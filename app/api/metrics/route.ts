import { NextResponse } from "next/server";
import { getMetricSnapshot } from "@/lib/metrics";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    now: Date.now(),
    metrics: getMetricSnapshot(),
  });
}

