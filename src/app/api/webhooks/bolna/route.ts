import { NextResponse } from "next/server";
import { applyExecution } from "@/lib/calls";
import type { ExecutionPayload } from "@/lib/bolna";

export const runtime = "nodejs";

/**
 * Bolna posts the full execution payload here on every status change
 * (scheduled → queued → in-progress → completed, plus terminal failures).
 * Configured by scripts/sync-agent.mjs as agent_config.webhook_url with ?token=WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const expected = process.env.WEBHOOK_SECRET;
  if (expected && url.searchParams.get("token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: ExecutionPayload;
  try {
    payload = (await req.json()) as ExecutionPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const call = await applyExecution(payload);
    return NextResponse.json({ ok: true, callId: call?.id ?? null, status: payload.status });
  } catch (err) {
    console.error("webhook error", err);
    // 200 so Bolna does not count it as a failed delivery for a data problem on our side.
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
