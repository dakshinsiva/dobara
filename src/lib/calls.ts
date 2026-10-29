import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Call, Contact, ExtractedData } from "@/db/schema";
import { bolna, TERMINAL_STATUSES, type ExecutionPayload } from "./bolna";
import { optionalEnv, requireEnv } from "./env";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";

const { contacts, calls } = schema;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
}

/** Everything the prompt's {{variables}} need for one contact. */
export function buildUserData(contact: Contact) {
  return {
    customer_name: contact.name,
    brand: contact.brand,
    product: contact.product ?? "your order",
    flavour: contact.flavour ?? "",
    days_since_order: daysSince(contact.lastOrderAt) ?? "a few",
    cohort: contact.cohort,
    last_summary: contact.lastSummary ?? "This is the first call.",
    language: contact.language,
    offer: optionalEnv("OFFER_TEXT", "10% off the next order with code DOBARA10, valid for 7 days"),
    timezone: "Asia/Kolkata",
  };
}

export async function startCallForContact(
  contactId: string,
  opts: { bypassGuardrails?: boolean } = {}
): Promise<Call> {
  const db = getDb();
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new Error("Contact not found");
  if (contact.group === "control") throw new Error("Control-group contacts are never called");
  if (contact.doNotCall) throw new Error("Contact asked not to be called");

  const fromNumber = optionalEnv("BOLNA_FROM_NUMBER");
  const res = await bolna.startCall({
    agent_id: requireEnv("BOLNA_AGENT_ID"),
    recipient_phone_number: contact.phone,
    ...(fromNumber ? { from_phone_number: fromNumber } : {}),
    user_data: buildUserData(contact),
    agent_data: { language: contact.language },
    retry_config: {
      enabled: true,
      max_retries: 1,
      retry_on_statuses: ["no-answer", "busy"],
      retry_intervals_minutes: [30],
    },
    // Manual "Call now" clicks are intentional; batch/scheduled calls keep the 10:00-19:00 window.
    bypass_call_guardrails: opts.bypassGuardrails ?? false,
  });

  const [row] = await db
    .insert(calls)
    .values({ contactId: contact.id, executionId: res.execution_id, status: res.status ?? "queued" })
    .returning();
  return row;
}

function objective(extracted: ExtractedData | null | undefined, name: string): string | null {
  return extracted?.[CATEGORY.name]?.[name]?.objective ?? null;
}
function subjective(extracted: ExtractedData | null | undefined, name: string): string | null {
  const v = extracted?.[CATEGORY.name]?.[name]?.subjective;
  return v && v.trim() ? v : null;
}

/**
 * Upsert a Bolna execution payload (from the webhook or a manual refresh) into `calls`,
 * and update the contact's memory and flags once the call is complete.
 */
export async function applyExecution(payload: ExecutionPayload): Promise<Call | null> {
  const db = getDb();
  if (!payload?.id) return null;

  const extracted =
    payload.extracted_data && Object.keys(payload.extracted_data).length > 0
      ? (payload.extracted_data as ExtractedData)
      : null;

  const values = {
    status: String(payload.status ?? "queued"),
    conversationDuration: payload.conversation_duration ?? 0,
    transcript: payload.transcript ?? null,
    summary: payload.summary ?? null,
    extracted,
    recordingUrl: payload.telephony_data?.recording_url ?? null,
    totalCostCents: payload.total_cost ?? null,
    hangupReason: payload.telephony_data?.hangup_reason ?? null,
    raw: payload as Record<string, unknown>,
    updatedAt: new Date(),
  };

  let [call] = await db.select().from(calls).where(eq(calls.executionId, payload.id)).limit(1);

  if (call) {
    [call] = await db.update(calls).set(values).where(eq(calls.id, call.id)).returning();
  } else {
    // Unknown execution (e.g. started from the Bolna dashboard): link by phone if we can.
    const phone = payload.user_number ?? payload.context_details?.recipient_phone_number ?? null;
    let contactId: string | null = null;
    if (phone) {
      const [c] = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
      contactId = c?.id ?? null;
    }
    [call] = await db
      .insert(calls)
      .values({ executionId: payload.id, contactId, ...values })
      .returning();
  }

  // Memory and flags only once the call is really over and extractions exist.
  if (call.contactId && payload.status === "completed" && extracted) {
    const memory = subjective(extracted, D.nextCallSummary) ?? payload.summary ?? null;
    const redFlag = objective(extracted, D.redFlag);
    const callback = objective(extracted, D.callback);
    const noteParts: string[] = [];
    if (redFlag && redFlag !== "none") noteParts.push(`red flag: ${redFlag}`);
    if (callback && callback !== "no") noteParts.push(`callback: ${callback}`);
    if (objective(extracted, D.sendLink) === "yes") noteParts.push("send WhatsApp reorder link");

    await db
      .update(contacts)
      .set({
        ...(memory ? { lastSummary: memory } : {}),
        ...(redFlag === "do_not_call" ? { doNotCall: 1 } : {}),
        ...(noteParts.length ? { notes: `${new Date().toISOString().slice(0, 10)}: ${noteParts.join("; ")}` } : {}),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, call.contactId));
  }

  return call;
}

/** Re-fetch an execution from Bolna (for local dev without a public webhook). */
export async function refreshCall(callId: string): Promise<Call | null> {
  const db = getDb();
  const [call] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
  if (!call?.executionId) return null;
  const payload = await bolna.getExecution(call.executionId);
  return applyExecution(payload);
}

export function isTerminal(status: string) {
  return (TERMINAL_STATUSES as string[]).includes(status);
}

export async function recentCalls(limit = 50) {
  const db = getDb();
  return db
    .select({
      call: calls,
      contact: contacts,
    })
    .from(calls)
    .leftJoin(contacts, eq(calls.contactId, contacts.id))
    .orderBy(desc(calls.createdAt))
    .limit(limit);
}
