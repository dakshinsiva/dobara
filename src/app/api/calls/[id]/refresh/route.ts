import { NextResponse } from "next/server";
import { refreshCall } from "@/lib/calls";

export const runtime = "nodejs";

/** Pull the latest execution state from Bolna (useful when no public webhook is configured). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const call = await refreshCall(id);
    if (!call) return NextResponse.json({ error: "call not found" }, { status: 404 });
    return NextResponse.json({ ok: true, call });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
