import { NextResponse } from "next/server";

/** Remember a theme choice in a cookie and bounce back. Without a cookie the OS preference applies. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const set = url.searchParams.get("set");
  const back = url.searchParams.get("back") ?? "/";
  const target = back.startsWith("/") && !back.startsWith("//") ? back : "/";
  const res = NextResponse.redirect(new URL(target, url.origin), 303);
  if (set === "light" || set === "dark") {
    res.cookies.set("theme", set, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    res.cookies.delete("theme");
  }
  return res;
}
