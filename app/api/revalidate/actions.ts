import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const PRODUCT_WEBHOOKS = [
  "random-user/create",
  "random-user/delete",
  "random-user/update",
];

export async function handleWebhook(req: NextRequest): Promise<NextResponse> {
  const secretKey = process.env.REVALIDATION_SECRET || "eddy-test";
  const headersList = await headers();

  const topic = headersList.get("topic") || "unknown";
  const secret = req.nextUrl.searchParams.get("secret");
  const isProductUpdate = PRODUCT_WEBHOOKS.includes(topic);

  // 시크릿 안 맞으면 그냥 200만 리턴 (외부에 OK만 해주는 패턴)
  if (!secret || secret !== secretKey) {
    return NextResponse.json({ status: 200, reason: "invalid secret" });
  }

  if (!isProductUpdate) {
    return NextResponse.json({
      status: 200,
      reason: "not product topic",
    });
  }

  // 여기서 Redis 기반 CacheHandler + use cache 계층의 캐시 무효화
  revalidateTag("random-user", { expire: 0 }); // 즉시 만료

  console.log("캐시 무효화 완료 (random-user)");

  return NextResponse.json({
    status: 202,
    revalidated: true,
    tag: "random-user",
    now: Date.now(),
  });
}
