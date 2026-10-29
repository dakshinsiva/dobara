import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, isPublicPath, SESSION_COOKIE, sessionToken } from "@/lib/auth";

/** Password gate for the whole console when DEMO_PASSWORD is set. */
export async function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken())) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("back", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|xml)$).*)"],
};
