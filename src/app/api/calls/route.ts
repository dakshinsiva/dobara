import { NextResponse } from "next/server";
import { z } from "zod";
import { startCallForContact } from "@/lib/calls";
import { BolnaError } from "@/lib/bolna";

export const runtime = "nodejs";

const Body = z.object({
  contactId: z.string().uuid(),
  /** Ignore the agent's calling-hours window (manual test calls). Default true from the dashboard. */
  bypassGuardrails: z.boolean().default(true),
});

/** Start an outbound call to one contact. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "contactId (uuid) required" }, { status: 400 });
  }
  try {
    const call = await startCallForContact(parsed.data.contactId, {
      bypassGuardrails: parsed.data.bypassGuardrails,
    });
    return NextResponse.json({ ok: true, call });
  } catch (err) {
    const status = err instanceof BolnaError ? 502 : 400;
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status });
  }
}
