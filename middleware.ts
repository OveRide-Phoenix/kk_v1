import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DESKTOP_UI_VERSION_COOKIE,
  DESKTOP_UI_VERSION_QUERY_PARAM,
  getDefaultDesktopUiVersion,
  isDesktopUiOverrideEnabled,
  parseDesktopUiVersion,
} from "@/lib/desktop-ui-version";

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const isCustomerPath = pathname === "/customer" || pathname.startsWith("/customer/");

  if (isCustomerPath) {
    const overrideEnabled = isDesktopUiOverrideEnabled();
    const queryVersion = overrideEnabled
      ? parseDesktopUiVersion(searchParams.get(DESKTOP_UI_VERSION_QUERY_PARAM))
      : null;
    const cookieVersion = overrideEnabled
      ? parseDesktopUiVersion(req.cookies.get(DESKTOP_UI_VERSION_COOKIE)?.value)
      : null;
    const selectedVersion = queryVersion ?? cookieVersion ?? getDefaultDesktopUiVersion();
    const rewrittenPath = pathname.replace(/^\/customer(?=\/|$)/, "/customer-v2");

    if (queryVersion) {
      const canonicalUrl = req.nextUrl.clone();
      canonicalUrl.searchParams.delete(DESKTOP_UI_VERSION_QUERY_PARAM);
      canonicalUrl.pathname = queryVersion === "v2" ? rewrittenPath : pathname;

      const response = NextResponse.redirect(canonicalUrl);
      response.cookies.set(DESKTOP_UI_VERSION_COOKIE, queryVersion, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
      });
      return response;
    }

    const response =
      selectedVersion === "v2"
        ? NextResponse.redirect(new URL(rewrittenPath, req.url))
        : NextResponse.next();

    return response;
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

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
  matcher: ["/admin/:path*", "/customer", "/customer/:path*"],
};
