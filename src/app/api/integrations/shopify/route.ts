import { NextResponse } from "next/server";
import { z } from "zod";
import { LANGUAGES } from "@/db/schema";
import { errorResponse, jsonError, parseJson } from "@/lib/http";
import { ShopifyError } from "@/lib/shopify/client";
import { connectShopify, disconnectShopify, getIntegration } from "@/lib/shopify/sync";

export const runtime = "nodejs";

const Body = z.object({
  shop: z.string().min(3).max(200),
  token: z.string().min(4).max(500),
  settings: z
    .object({
      calledShare: z.number().min(0).max(1).optional(),
      daysPerOrder: z.number().int().min(7).max(365).optional(),
      defaultLanguage: z.enum(LANGUAGES).optional(),
      lookbackDays: z.number().int().min(30).max(730).optional(),
    })
    .optional(),
});

/** Current connection, without the token. */
export async function GET() {
  try {
    const row = await getIntegration("shopify");
    if (!row) return NextResponse.json({ connected: false });
    return NextResponse.json({
      connected: true,
      shop: row.shop,
      shopName: row.shopName,
      settings: row.settings,
      lastSyncAt: row.lastSyncAt,
      lastSyncSummary: row.lastSyncSummary,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Validate a store token and save it. */
export async function POST(req: Request) {
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;
  try {
    const result = await connectShopify(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ShopifyError) return jsonError(err.message, 400);
    return errorResponse(err);
  }
}

export async function DELETE() {
  try {
    await disconnectShopify();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
