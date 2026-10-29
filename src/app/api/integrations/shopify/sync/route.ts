import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { ShopifyError } from "@/lib/shopify/client";
import { syncShopify } from "@/lib/shopify/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Pull orders and rebuild cohorts now. */
export async function POST() {
  try {
    const summary = await syncShopify();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    if (err instanceof ShopifyError) return jsonError(err.message, 502);
    return errorResponse(err);
  }
}
