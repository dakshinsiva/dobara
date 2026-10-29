/**
 * Read models for the console: overview numbers, voice-of-customer distributions,
 * reorder lift against the control group. Computed in process; fine for pilot sizes.
 */
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Action, Call, Cohort, Contact, Group } from "@/db/schema";
import { COHORTS } from "@/db/schema";
import { TERMINAL_STATUSES } from "./bolna";
import { humanize } from "./labels";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";

const { contacts, calls, actions } = schema;

export type CallWithContact = { call: Call; contact: Contact | null };
export type ActionWithContext = { action: Action; contact: Contact | null; call: Call | null };

function value(call: Call, field: string): string | null {
  return call.extracted?.[CATEGORY.name]?.[field]?.objective ?? null;
}
function text(call: Call, field: string): string | null {
  const v = call.extracted?.[CATEGORY.name]?.[field]?.subjective;
  return v && v.trim() ? v.trim() : null;
}

/** A call that actually happened: completed with some conversation. */
export function isConversation(call: Call) {
  return call.status === "completed" && call.conversationDuration > 0;
}

export interface Bucket {
  value: string;
  label: string;
  count: number;
  share: number;
}

function distribution(rows: Call[], field: string, order?: string[]): Bucket[] {
  const counts = new Map<string, number>();
  for (const c of rows) {
    const v = value(c, field);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const keys = order
    ? [...order.filter((k) => counts.has(k)), ...[...counts.keys()].filter((k) => !order.includes(k))]
    : [...counts.keys()];
  return keys
    .map((k) => ({
      value: k,
      label: humanize(k),
      count: counts.get(k) ?? 0,
      share: total ? (counts.get(k) ?? 0) / total : 0,
    }))
    .sort((a, b) => (order ? 0 : b.count - a.count));
}

export interface GroupStats {
  group: Group;
  enrolled: number;
  reordered: number;
  rate: number | null;
}

export interface Lift {
  called: GroupStats;
  control: GroupStats;
  /** Percentage-point difference in reorder rate, called minus control. */
  points: number | null;
  /** Relative uplift, e.g. 0.25 = called group reorders 25% more often. */
  relative: number | null;
}

function groupStats(rows: Contact[], group: Group): GroupStats {
  const g = rows.filter((c) => c.group === group);
  const reordered = g.filter((c) => c.reorderedAt).length;
  return { group, enrolled: g.length, reordered, rate: g.length ? reordered / g.length : null };
}

export function computeLift(rows: Contact[]): Lift {
  const called = groupStats(rows, "called");
  const control = groupStats(rows, "control");
  const points = called.rate != null && control.rate != null ? (called.rate - control.rate) * 100 : null;
  const relative =
    called.rate != null && control.rate != null && control.rate > 0 ? called.rate / control.rate - 1 : null;
  return { called, control, points, relative };
}

export interface Overview {
  contacts: Contact[];
  calls: CallWithContact[];
  openActions: ActionWithContext[];
  totals: {
    contacts: number;
    called: number;
    control: number;
    byCohort: Record<Cohort, { called: number; control: number }>;
    conversations: number;
    reached: number;
    reorderYes: number;
    reorderMaybe: number;
    redFlags: number;
    openActions: number;
    active: number;
    costCents: number;
  };
  lift: Lift;
}

export async function getOverview(): Promise<Overview> {
  const db = getDb();
  const [contactRows, callRows, openActions] = await Promise.all([
    db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(500),
    db
      .select({ call: calls, contact: contacts })
      .from(calls)
      .leftJoin(contacts, eq(calls.contactId, contacts.id))
      .orderBy(desc(calls.createdAt))
      .limit(200),
    listActions("open", 50),
  ]);

  const conversations = callRows.filter((r) => isConversation(r.call));
  const byCohort = Object.fromEntries(
    COHORTS.map((c) => [
      c,
      {
        called: contactRows.filter((x) => x.cohort === c && x.group === "called").length,
        control: contactRows.filter((x) => x.cohort === c && x.group === "control").length,
      },
    ])
  ) as Overview["totals"]["byCohort"];

  return {
    contacts: contactRows,
    calls: callRows,
    openActions,
    totals: {
      contacts: contactRows.length,
      called: contactRows.filter((c) => c.group === "called").length,
      control: contactRows.filter((c) => c.group === "control").length,
      byCohort,
      conversations: conversations.length,
      reached: conversations.filter((r) => value(r.call, D.reached) === "yes").length,
      reorderYes: conversations.filter((r) =>
        ["yes", "already_reordered"].includes(value(r.call, D.reorderIntent) ?? "")
      ).length,
      reorderMaybe: conversations.filter((r) => value(r.call, D.reorderIntent) === "maybe").length,
      redFlags: conversations.filter((r) => (value(r.call, D.redFlag) ?? "none") !== "none").length,
      openActions: openActions.length,
      active: callRows.filter((r) => !(TERMINAL_STATUSES as string[]).includes(r.call.status)).length,
      costCents: callRows.reduce((sum, r) => sum + (r.call.totalCostCents ?? 0), 0),
    },
    lift: computeLift(contactRows),
  };
}

export interface Quote {
  callId: string;
  name: string;
  at: Date;
  changeRequest: string | null;
  issueDetail: string | null;
  issue: string | null;
  satisfaction: string | null;
}

export interface Insights {
  conversations: number;
  distributions: Record<"usage" | "stock" | "satisfaction" | "issue" | "reorderIntent" | "redFlag", Bucket[]>;
  quotes: Quote[];
  lift: Lift;
  cost: { totalCents: number; perConversationCents: number | null; avgSeconds: number | null };
}

export async function getInsights(): Promise<Insights> {
  const db = getDb();
  const [contactRows, rows] = await Promise.all([
    db.select().from(contacts),
    db
      .select({ call: calls, contact: contacts })
      .from(calls)
      .leftJoin(contacts, eq(calls.contactId, contacts.id))
      .orderBy(desc(calls.createdAt))
      .limit(1000),
  ]);
  const convs = rows.filter((r) => isConversation(r.call));
  const callsOnly = convs.map((r) => r.call);

  const quotes: Quote[] = convs
    .map((r) => ({
      callId: r.call.id,
      name: r.contact?.name ?? "Unknown",
      at: r.call.createdAt,
      changeRequest: text(r.call, D.changeRequest),
      issueDetail: text(r.call, D.issueDetail),
      issue: value(r.call, D.issue),
      satisfaction: value(r.call, D.satisfaction),
    }))
    .filter((q) => q.changeRequest || q.issueDetail);

  const totalCents = callsOnly.reduce((s, c) => s + (c.totalCostCents ?? 0), 0);
  const totalSeconds = callsOnly.reduce((s, c) => s + c.conversationDuration, 0);

  return {
    conversations: convs.length,
    distributions: {
      usage: distribution(callsOnly, D.usage, ["daily", "sometimes", "stopped", "not_started", "unknown"]),
      stock: distribution(callsOnly, D.stock, ["finished", "under_a_week", "more_than_a_week", "unknown"]),
      satisfaction: distribution(callsOnly, D.satisfaction, ["happy", "neutral", "unhappy", "unknown"]),
      issue: distribution(callsOnly, D.issue),
      reorderIntent: distribution(callsOnly, D.reorderIntent, ["yes", "already_reordered", "maybe", "no", "unknown"]),
      redFlag: distribution(callsOnly, D.redFlag),
    },
    quotes,
    lift: computeLift(contactRows),
    cost: {
      totalCents,
      perConversationCents: convs.length ? totalCents / convs.length : null,
      avgSeconds: convs.length ? Math.round(totalSeconds / convs.length) : null,
    },
  };
}

export async function listActions(status: "open" | "done" | "all" = "open", limit = 200): Promise<ActionWithContext[]> {
  const db = getDb();
  const query = db
    .select({ action: actions, contact: contacts, call: calls })
    .from(actions)
    .leftJoin(contacts, eq(actions.contactId, contacts.id))
    .leftJoin(calls, eq(actions.callId, calls.id))
    .orderBy(desc(actions.createdAt))
    .limit(limit);
  return status === "all" ? query : query.where(eq(actions.status, status));
}

/** Contacts a campaign would dial right now: called group, not opted out, no attempt in 24 h. */
export function eligibleForCampaign(contactRows: Contact[], callRows: CallWithContact[], cohort?: Cohort): Contact[] {
  const since = Date.now() - 24 * 3_600_000;
  const recent = new Set(
    callRows
      .filter((r) => r.call.contactId && new Date(r.call.createdAt).getTime() > since)
      .map((r) => r.call.contactId)
  );
  return contactRows.filter(
    (c) => c.group === "called" && !c.doNotCall && (!cohort || c.cohort === cohort) && !recent.has(c.id)
  );
}
