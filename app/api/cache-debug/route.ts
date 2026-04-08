import { NextResponse } from "next/server";
import { getRuntimeIdentity } from "@/lib/runtime-context";

export async function GET(): Promise<NextResponse> {
  try {
    const { inspectRedisCacheState } = await import("@/redis-handler");
    const cacheState = await inspectRedisCacheState();

    return NextResponse.json(
      {
        runtime: getRuntimeIdentity(),
        cacheState,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        runtime: getRuntimeIdentity(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
