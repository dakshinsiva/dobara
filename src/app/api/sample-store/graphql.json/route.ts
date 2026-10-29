import { NextResponse } from "next/server";
import { SAMPLE_SHOP_NAME, sampleOrders } from "@/lib/shopify/sample";

export const runtime = "nodejs";

/**
 * A stand-in for the Shopify Admin GraphQL endpoint, answering only the two
 * queries this app sends. Lets anyone try "connect a store" without credentials.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string };
  const query = body.query ?? "";
  if (/\bshop\s*{/.test(query)) {
    return NextResponse.json({ data: { shop: { name: SAMPLE_SHOP_NAME } } });
  }
  if (/\borders\s*\(/.test(query)) {
    return NextResponse.json({
      data: { orders: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: sampleOrders() } },
    });
  }
  return NextResponse.json({ errors: [{ message: "Unsupported query in the sample store" }] }, { status: 400 });
}
