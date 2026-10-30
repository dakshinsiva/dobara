/**
 * Call lifecycle: start phone or browser calls, ingest Bolna execution payloads,
 * and turn extractions into customer memory and follow-up actions.
 */
import { and, desc, eq, gt, inArray, notExists, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  CALLABLE_COHORTS,
  type ActionType,
  type Call,
  type Cohort,
  type Contact,
  type ExtractedData,
  type Language,
  type NewAction,
} from "@/db/schema";
import { bolna, BolnaError, TERMINAL_STATUSES, type ExecutionPayload, type WebCallSession } from "./bolna";
import { optionalEnv, requireEnv } from "./env";
import { daysSince } from "./format";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";

const { contacts, calls, actions } = schema;

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

/** A stand-in customer for browser demos when no contact is chosen. */
export function guestUserData(name: string, language: Language = "en") {
  return {
    customer_name: name.trim() || "there",
    brand: optionalEnv("BRAND_NAME", "Cosmix"),
    product: "No-Nonsense Plant Protein",
    flavour: "Indonesian Cacao",
    days_since_order: 28,
    cohort: "running_low",
    last_summary: "This is the first call.",
    language,
    offer: optionalEnv("OFFER_TEXT", "10% off the next order with code DOBARA10, valid for 7 days"),
    timezone: "Asia/Kolkata",
  };
}

async function loadCallableContact(contactId: string): Promise<Contact> {
  const db = getDb();
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new Error("Contact not found");
  if (contact.group === "control") throw new Error("Control-group contacts are never called");
  if (contact.doNotCall) throw new Error("Contact asked not to be called");
  return contact;
}

export async function startCallForContact(contactId: string, opts: { bypassGuardrails?: boolean } = {}): Promise<Call> {
  const db = getDb();
  const contact = await loadCallableContact(contactId);

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
    // Manual "Call now" clicks are intentional; campaigns keep the 10:00-19:00 window.
    bypass_call_guardrails: opts.bypassGuardrails ?? false,
  });

  const [row] = await db
    .insert(calls)
    .values({ contactId: contact.id, executionId: res.execution_id, status: res.status ?? "queued", channel: "phone" })
    .returning();
  return row;
}

/**
 * Mint a browser-call session for the dashboard's "Talk to Dobara" button and
 * register the run so the webhook can enrich it like any phone call.
 */
export async function startWebCall(input: {
  contactId?: string;
  guestName?: string;
  language?: Language;
}): Promise<{ session: WebCallSession; call: Call }> {
  const db = getDb();
  let contact: Contact | null = null;
  if (input.contactId) contact = await loadCallableContact(input.contactId);

  const language = contact?.language ?? input.language ?? "en";
  const userData = contact ? buildUserData(contact) : guestUserData(input.guestName ?? "", language);
  const session = await bolna.createWebCallSession({
    agent_id: requireEnv("BOLNA_AGENT_ID"),
    user_data: userData,
    agent_data: { language },
  });

  const [call] = await db
    .insert(calls)
    .values({ contactId: contact?.id ?? null, executionId: session.run_id, status: "queued", channel: "web" })
    .returning();
  return { session, call };
}

export interface CampaignResult {
  eligible: number;
  started: Array<{ contactId: string; name: string; callId: string }>;
  failed: Array<{ contactId: string; name: string; error: string }>;
}

/**
 * Dial every eligible contact in a cohort, one after another. Eligible = called group,
 * not opted out, and no call attempted in the last 24 hours. Calling-hour guardrails stay on.
 */
export async function startCampaign(
  opts: { cohort?: Cohort; contactIds?: string[]; limit?: number } = {}
): Promise<CampaignResult> {
  const db = getDb();
  if (opts.contactIds && opts.contactIds.length === 0) return { eligible: 0, started: [], failed: [] };
  const since = new Date(Date.now() - 24 * 3_600_000);
  const recentCall = db
    .select({ id: calls.id })
    .from(calls)
    .where(and(eq(calls.contactId, contacts.id), gt(calls.createdAt, since)));

  const eligible = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.group, "called"),
        eq(contacts.doNotCall, 0),
        opts.cohort ? eq(contacts.cohort, opts.cohort) : inArray(contacts.cohort, [...CALLABLE_COHORTS]),
        opts.contactIds ? inArray(contacts.id, opts.contactIds) : undefined,
        notExists(recentCall)
      )
    )
    .orderBy(contacts.createdAt)
    .limit(Math.min(opts.limit ?? 20, 100));

  const result: CampaignResult = { eligible: eligible.length, started: [], failed: [] };
  for (const c of eligible) {
    try {
      const call = await startCallForContact(c.id, { bypassGuardrails: false });
      result.started.push({ contactId: c.id, name: c.name, callId: call.id });
    } catch (err) {
      result.failed.push({ contactId: c.id, name: c.name, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}

function objective(extracted: ExtractedData | null | undefined, name: string): string | null {
  return extracted?.[CATEGORY.name]?.[name]?.objective ?? null;
}
function subjective(extracted: ExtractedData | null | undefined, name: string): string | null {
  const v = extracted?.[CATEGORY.name]?.[name]?.subjective;
  return v && v.trim() ? v : null;
}

/** Follow-ups a brand's team must do after this call, derived from the extraction pass. */
export function deriveActions(
  extracted: ExtractedData,
  contact: Pick<Contact, "product" | "flavour">
): Array<Pick<NewAction, "type" | "detail">> {
  const out: Array<{ type: ActionType; detail: string | null }> = [];

  if (objective(extracted, D.sendLink) === "yes") {
    out.push({ type: "send_link", detail: [contact.product, contact.flavour].filter(Boolean).join(" · ") || null });
  }
  const callback = objective(extracted, D.callback);
  if (callback === "human") out.push({ type: "callback_human", detail: null });
  if (callback === "later") out.push({ type: "callback_later", detail: null });

  const issue = objective(extracted, D.issue);
  const unhappy = objective(extracted, D.satisfaction) === "unhappy";
  if (unhappy || (issue && ["delivery", "results", "digestion"].includes(issue))) {
    out.push({ type: "cx_followup", detail: subjective(extracted, D.issueDetail) ?? issue });
  }
  const redFlag = objective(extracted, D.redFlag);
  if (redFlag && redFlag !== "none") out.push({ type: "red_flag", detail: redFlag });

  return out;
}

/**
 * Upsert a Bolna execution payload (from the webhook or a manual refresh) into `calls`,
 * then, once the call is complete, update the contact's memory and create follow-up actions.
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
    // Browser calls report fractional seconds (143.9); the column is an integer.
    conversationDuration: Math.round(payload.conversation_duration ?? 0),
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
    const createdAt = payload.created_at ? new Date(payload.created_at) : undefined;
    [call] = await db
      .insert(calls)
      .values({
        executionId: payload.id,
        contactId,
        ...values,
        ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { createdAt } : {}),
      })
      .returning();
  }

  // Memory, flags and actions only once the call is really over and extractions exist.
  if (call.contactId && payload.status === "completed" && extracted) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, call.contactId)).limit(1);
    const memory = subjective(extracted, D.nextCallSummary) ?? payload.summary ?? null;
    const redFlag = objective(extracted, D.redFlag);

    await db
      .update(contacts)
      .set({
        ...(memory ? { lastSummary: memory } : {}),
        ...(redFlag === "do_not_call" ? { doNotCall: 1 } : {}),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, call.contactId));

    const existing = await db.select({ type: actions.type }).from(actions).where(eq(actions.callId, call.id));
    const have = new Set(existing.map((a) => a.type));
    const fresh = deriveActions(extracted, contact ?? { product: null, flavour: null }).filter(
      (a) => !have.has(a.type)
    );
    if (fresh.length) {
      await db.insert(actions).values(fresh.map((a) => ({ ...a, contactId: call.contactId, callId: call.id })));
    }
  }

  return call;
}

/** Re-fetch an execution from Bolna (fallback when the webhook cannot reach us). */
export async function refreshCall(callId: string): Promise<Call | null> {
  const db = getDb();
  const [call] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
  if (!call?.executionId) return null;
  const ageMs = Date.now() - new Date(call.createdAt).getTime();
  const abandoned = call.channel === "web" && !isTerminal(call.status) && ageMs > 5 * 60_000;

  let payload: ExecutionPayload;
  try {
    payload = await bolna.getExecution(call.executionId);
  } catch (err) {
    if (err instanceof BolnaError && err.status === 404 && abandoned) return retireWebSession(call.id);
    throw err;
  }
  // Bolna keeps a minted-but-never-connected browser session "in-progress" with zero duration.
  if (abandoned && !isTerminal(String(payload.status)) && !(payload.conversation_duration ?? 0)) {
    return retireWebSession(call.id);
  }
  return applyExecution(payload);
}

async function retireWebSession(callId: string): Promise<Call> {
  const db = getDb();
  const [retired] = await db
    .update(calls)
    .set({ status: "canceled", hangupReason: "Browser session never connected", updatedAt: new Date() })
    .where(eq(calls.id, callId))
    .returning();
  return retired;
}

export async function refreshByExecutionId(executionId: string): Promise<Call | null> {
  const db = getDb();
  const [call] = await db.select().from(calls).where(eq(calls.executionId, executionId)).limit(1);
  if (!call) return null;
  return refreshCall(call.id);
}

export function isTerminal(status: string) {
  return (TERMINAL_STATUSES as string[]).includes(status);
}

export async function recentCalls(limit = 50) {
  const db = getDb();
  return db
    .select({ call: calls, contact: contacts })
    .from(calls)
    .leftJoin(contacts, eq(calls.contactId, contacts.id))
    .orderBy(desc(calls.createdAt))
    .limit(limit);
}

/** Calls Bolna has not finished with yet; the dashboard polls while any exist. */
export async function activeCalls() {
  const db = getDb();
  return db.select().from(calls).where(notInArray(calls.status, TERMINAL_STATUSES)).orderBy(desc(calls.createdAt));
}
