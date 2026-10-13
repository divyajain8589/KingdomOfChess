import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection. Reads the role out of the session JWT *without* verifying it —
 * this only decides where to send the browser. Every API call and socket connection is verified
 * by the backend, so a forged cookie gets you a redirect loop at worst, never data.
 */
const AUTH_COOKIE = "koc_token";

function readSession(token: string | undefined): { role: "coach" | "student" } | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return payload.role === "coach" || payload.role === "student" ? { role: payload.role } : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request.cookies.get(AUTH_COOKIE)?.value);
  const home = session?.role === "coach" ? "/coach" : "/student";
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/login") return session ? to(home) : NextResponse.next();
  if (!session) return to(`/login?next=${encodeURIComponent(pathname)}`);
  if (pathname === "/") return to(home);
  if (pathname.startsWith("/coach") && session.role !== "coach") return to(home);
  if (pathname.startsWith("/student") && session.role !== "student") return to(home);
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/coach/:path*", "/student/:path*", "/matches/:path*"],
};
