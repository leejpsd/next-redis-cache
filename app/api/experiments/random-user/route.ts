import { NextResponse } from "next/server";
import { getLiveRandomUser } from "@/app/lib/getRandomUser";

export async function GET() {
  const payload = await getLiveRandomUser();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
