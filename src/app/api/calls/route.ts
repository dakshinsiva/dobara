import { NextResponse } from "next/server";
import { z } from "zod";
import { startCallForContact } from "@/lib/calls";
import { errorResponse, parseJson } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({
  contactId: z.string().uuid(),
  /** Ignore the agent's calling-hours window (manual test calls). Default true from the dashboard. */
  bypassGuardrails: z.boolean().default(true),
});

/** Start an outbound phone call to one contact. */
export async function POST(req: Request) {
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;
  try {
    const call = await startCallForContact(parsed.data.contactId, {
      bypassGuardrails: parsed.data.bypassGuardrails,
    });
    return NextResponse.json({ ok: true, call });
  } catch (err) {
    return errorResponse(err);
  }
}
