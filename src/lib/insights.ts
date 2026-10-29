/**
 * Read models for the console: overview numbers, voice-of-customer distributions,
 * reorder lift against the control group. Computed in process; fine for pilot sizes.
 */
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Action, Call, Cohort, Contact, Group } from "@/db/schema";
import { CALLABLE_COHORTS, COHORTS } from "@/db/schema";
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
  /** Two-proportion z-test on reorder rates; null until both groups have members and a reorder exists. */
  pValue: number | null;
  /** True when the difference clears 95% (two-sided). */
  significant: boolean;
  /** Customers needed per group to confirm the observed difference at 95% with 80% power. */
  neededPerGroup: number | null;
  /** Reorders in the called group beyond what the control rate predicts. */
  incrementalReorders: number | null;
}

/** Standard normal CDF (Abramowitz and Stegun 7.1.26). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-z * z);
  return 0.5 * (1 + (z < 0 ? -erf : erf));
}

function groupStats(rows: Contact[], group: Group): GroupStats {
  const g = rows.filter((c) => c.group === group);
  const reordered = g.filter((c) => c.reorderedAt).length;
  return { group, enrolled: g.length, reordered, rate: g.length ? reordered / g.length : null };
}

export function computeLift(rows: Contact[]): Lift {
  const called = groupStats(rows, "called");
  const control = groupStats(rows, "control");
  const anyReorders = called.reordered + control.reordered > 0;
  const comparable = anyReorders && called.rate != null && control.rate != null;
  const points = comparable ? (called.rate! - control.rate!) * 100 : null;
  const relative = comparable && control.rate! > 0 ? called.rate! / control.rate! - 1 : null;

  let pValue: number | null = null;
  let neededPerGroup: number | null = null;
  if (comparable) {
    const p1 = called.rate!;
    const p2 = control.rate!;
    const pooled = (called.reordered + control.reordered) / (called.enrolled + control.enrolled);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / called.enrolled + 1 / control.enrolled));
    if (se > 0) pValue = 2 * (1 - normalCdf(Math.abs(p1 - p2) / se));
    const diff = Math.abs(p1 - p2);
    if (diff > 0) {
      const pBar = (p1 + p2) / 2;
      const num = 1.96 * Math.sqrt(2 * pBar * (1 - pBar)) + 0.84 * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
      neededPerGroup = Math.ceil((num * num) / (diff * diff));
    }
  }
  const incrementalReorders = comparable ? Math.round(called.reordered - control.rate! * called.enrolled) : null;

  return {
    called,
    control,
    points,
    relative,
    pValue,
    significant: pValue != null && pValue < 0.05,
    neededPerGroup,
    incrementalReorders,
  };
}

/** One line a retention lead can act on. */
export function describeSignificance(lift: Lift): string {
  if (lift.points == null) return "Needs reorders in both groups to measure.";
  if (lift.significant)
    return `95% confident. Called ${pctText(lift.called.rate)} vs control ${pctText(lift.control.rate)}.`;
  if (lift.neededPerGroup == null) return "No difference observed yet.";
  const more = Math.max(0, lift.neededPerGroup - Math.min(lift.called.enrolled, lift.control.enrolled));
  return more > 0
    ? `Not yet significant. About ${more} more customers per group would confirm a ${Math.abs(lift.points).toFixed(0)}-point gap.`
    : "Not yet significant at this gap.";
}

function pctText(rate: number | null): string {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number | null;
  /** Conversion from the previous stage, 0..1 */
  rate: number | null;
  hint?: string;
}

/**
 * Eligible → attempted → reached → intent → link sent → reordered → incremental.
 * Counts are distinct customers in the called group.
 */
export function computeFunnel(
  contactRows: Contact[],
  callRows: CallWithContact[],
  actionRows: ActionWithContext[],
  lift: Lift
): FunnelStage[] {
  const eligible = contactRows.filter(
    (c) => c.group === "called" && !c.doNotCall && CALLABLE_COHORTS.includes(c.cohort)
  );
  const eligibleIds = new Set(eligible.map((c) => c.id));
  const attempted = new Set<string>();
  const reached = new Set<string>();
  const intent = new Set<string>();
  for (const { call } of callRows) {
    if (!call.contactId || call.channel !== "phone") continue;
    attempted.add(call.contactId);
    if (isConversation(call) && value(call, D.reached) === "yes") reached.add(call.contactId);
    if (isConversation(call) && ["yes", "already_reordered"].includes(value(call, D.reorderIntent) ?? ""))
      intent.add(call.contactId);
  }
  const linkAgreed = new Set(
    actionRows.filter((a) => a.action.type === "send_link" && a.action.contactId).map((a) => a.action.contactId!)
  );
  const linkSent = new Set(
    actionRows
      .filter((a) => a.action.type === "send_link" && a.action.status === "done" && a.action.contactId)
      .map((a) => a.action.contactId!)
  );
  const reordered = new Set(contactRows.filter((c) => c.group === "called" && c.reorderedAt).map((c) => c.id));

  const valueInr = Number(process.env.REORDER_VALUE_INR);
  const inc = lift.incrementalReorders;
  const incHint =
    inc != null && Number.isFinite(valueInr) && valueInr > 0
      ? `≈ ₹${Math.round(inc * valueInr).toLocaleString("en-IN")} at ₹${valueInr.toLocaleString("en-IN")} per reorder`
      : inc != null
        ? "beyond the control rate"
        : "needs reorders in both groups";

  const stages: FunnelStage[] = [
    { key: "eligible", label: "Eligible", value: eligible.length, rate: null, hint: "called group, due a call" },
    { key: "attempted", label: "Attempted", value: attempted.size, rate: null, hint: "at least one dial" },
    { key: "reached", label: "Reached", value: reached.size, rate: null, hint: "had a conversation" },
    { key: "intent", label: "Intent yes", value: intent.size, rate: null, hint: "will reorder" },
    { key: "link", label: "Link sent", value: linkSent.size, rate: null, hint: `${linkAgreed.size} agreed` },
    { key: "reordered", label: "Reordered", value: reordered.size, rate: null, hint: "from the store" },
    { key: "incremental", label: "Incremental", value: inc, rate: null, hint: incHint },
  ];
  for (let i = 1; i < stages.length - 1; i++) {
    const prev = stages[i - 1].value ?? 0;
    const cur = stages[i].value ?? 0;
    stages[i].rate = prev > 0 ? cur / prev : null;
  }
  void eligibleIds;
  return stages;
}

export interface Overview {
  contacts: Contact[];
  calls: CallWithContact[];
  openActions: ActionWithContext[];
  funnel: FunnelStage[];
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
  const [contactRows, callRows, allActions] = await Promise.all([
    db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(500),
    db
      .select({ call: calls, contact: contacts })
      .from(calls)
      .leftJoin(contacts, eq(calls.contactId, contacts.id))
      .orderBy(desc(calls.createdAt))
      .limit(500),
    listActions("all", 1000),
  ]);
  const openActions = allActions.filter((a) => a.action.status === "open").slice(0, 50);
  const lift = computeLift(contactRows);

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
    funnel: computeFunnel(contactRows, callRows, allActions, lift),
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
    lift,
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
    (c) =>
      c.group === "called" &&
      !c.doNotCall &&
      CALLABLE_COHORTS.includes(c.cohort) &&
      (!cohort || c.cohort === cohort) &&
      !recent.has(c.id)
  );
}
