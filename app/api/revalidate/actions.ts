import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

const PRODUCT_WEBHOOKS = [
  "random-user/create",
  "random-user/delete",
  "random-user/update",
];

export async function handleWebhook(req: NextRequest): Promise<NextResponse> {
  const headersList = await headers();

  const topic = headersList.get("topic") || "unknown";
  const secret = req.nextUrl.searchParams.get("secret");
  const isProductUpdate = PRODUCT_WEBHOOKS.includes(topic);

  if (!secret || secret !== env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { status: 401, reason: "invalid secret" },
      { status: 401 }
    );
  }

  if (!isProductUpdate) {
    return NextResponse.json({
      status: 400,
      reason: "not product topic",
    }, { status: 400 });
  }

  // 여기서 Redis 기반 CacheHandler + use cache 계층의 캐시 무효화
  revalidateTag("random-user", { expire: 0 }); // 즉시 만료

  console.log("캐시 무효화 완료 (random-user)");

  return NextResponse.json(
    {
      status: 202,
      revalidated: true,
      tag: "random-user",
      now: Date.now(),
    },
    { status: 202 }
  );
}
