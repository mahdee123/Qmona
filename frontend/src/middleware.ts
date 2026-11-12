import { NextResponse, type NextRequest } from "next/server";

/**
 * First line of defence for the admin portal: requests without a session
 * cookie are sent to the login page. Real authorization is always
 * enforced by the backend API (role checks on every /api/v1/manage endpoint).
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!request.cookies.get("sessionid")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }
  const res = NextResponse.next();
  if (pathname.startsWith("/admin") || pathname.startsWith("/preview")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

export const config = { matcher: ["/admin/:path*", "/preview/:path*"] };
