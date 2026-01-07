import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "./actions";

// export const runtime = 'edge';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return await handleWebhook(req);
}
