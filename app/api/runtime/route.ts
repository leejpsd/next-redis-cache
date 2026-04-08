import { NextRequest, NextResponse } from "next/server";
import { getRuntimeIdentity } from "@/lib/runtime-context";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") || null;

  return NextResponse.json(
    {
      now: Date.now(),
      requestId,
      runtime: getRuntimeIdentity(),
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
