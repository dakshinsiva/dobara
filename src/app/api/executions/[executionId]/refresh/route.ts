import { NextResponse } from "next/server";
import { isTerminal, refreshByExecutionId } from "@/lib/calls";
import { errorResponse, jsonError } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Pull an execution from Bolna by its id (the browser SDK only knows the run id).
 * Used by the "Talk to Dobara" page to find its call once the conversation ends.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ executionId: string }> }) {
  const { executionId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(executionId)) return jsonError("Bad execution id", 400);
  try {
    const call = await refreshByExecutionId(executionId);
    if (!call) return jsonError("Call not found", 404);
    return NextResponse.json({
      ok: true,
      callId: call.id,
      status: call.status,
      terminal: isTerminal(call.status),
      hasExtractions: Boolean(call.extracted),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
