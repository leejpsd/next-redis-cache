import { NextResponse } from "next/server";
import { getLiveRandomUser } from "@/app/lib/getRandomUser";

export async function GET() {
  const requestStartedAt = performance.now();
  const payload = await getLiveRandomUser();
  const totalDurationMs = performance.now() - requestStartedAt;

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "Server-Timing": `bff;dur=${totalDurationMs.toFixed(1)}`,
      "X-BFF-Duration-Ms": totalDurationMs.toFixed(1),
    },
  });
}
