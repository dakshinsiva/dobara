import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getIntegration, syncShopify } from "@/lib/shopify/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily store sync, triggered by Vercel Cron (see vercel.json) or any scheduler
 * that sends `Authorization: Bearer CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return jsonError("CRON_SECRET is not set", 503);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return jsonError("Unauthorized", 401);
  if (!(await getIntegration("shopify"))) return NextResponse.json({ ok: true, skipped: "no store connected" });
  try {
    const summary = await syncShopify();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : String(err), 502);
  }
}
