import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const url = new URL("/api/backend/auth/me", req.url);
  const meRes = await fetch(url, {
    // forward cookies to backend
    headers: { cookie: req.headers.get("cookie") || "" },
  });

  if (meRes.status !== 200) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const me = await meRes.json();
  if (me.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
