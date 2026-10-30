import { NextResponse } from "next/server";
import { authEnabled, passwordMatches, SESSION_COOKIE, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

function safeBack(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/overview";
}

/** Form post from /login. Sets the session cookie on success. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") ?? "");
  const back = safeBack(String(form?.get("back") ?? "/"));
  const url = new URL(req.url);

  if (!(await passwordMatches(password))) {
    const retry = new URL("/login", url.origin);
    retry.searchParams.set("error", "1");
    retry.searchParams.set("back", back);
    return NextResponse.redirect(retry, 303);
  }

  const res = NextResponse.redirect(new URL(back, url.origin), 303);
  if (authEnabled()) {
    res.cookies.set(SESSION_COOKIE, await sessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

/** Sign out. */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  void req;
  return res;
}
