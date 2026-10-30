import { NextResponse } from "next/server";
import { z } from "zod";
import { LANGUAGES } from "@/db/schema";
import { startWebCall } from "@/lib/calls";
import { errorResponse, parseJson } from "@/lib/http";

export const runtime = "nodejs";

const Body = z
  .object({
    contactId: z.string().uuid().optional(),
    guestName: z.string().max(60).optional(),
    /** Language the agent opens in for a guest; contacts carry their own */
    language: z.enum(LANGUAGES).optional(),
    /** Sent by @bolna/web-call when userData is set on the client; ignored, the server decides. */
    user_data: z.unknown().optional(),
  })
  .default({});

/**
 * Mints a short-lived browser-call session for @bolna/web-call.
 * The Bolna API key never leaves the server; the browser only receives
 * single-use SIP credentials that expire in about two minutes.
 */
export async function POST(req: Request) {
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;
  try {
    const { session, call } = await startWebCall(parsed.data);
    // The SDK expects Bolna's JSON as-is; we add our call id for the UI to follow up on.
    return NextResponse.json({ ...session, call_id: call.id });
  } catch (err) {
    return errorResponse(err);
  }
}
