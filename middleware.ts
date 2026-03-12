import { NextResponse, type NextRequest } from "next/server";

function getRequestId(req: NextRequest): string {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const requestId = getRequestId(req);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set("x-request-id", requestId);

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

