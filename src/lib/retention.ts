/**
 * Retention read model: cohort curves, the purchase ladder, replenishment windows,
 * segments and a week-over-week brief, all from order history. Where a customer
 * came from a CSV with no order rows, their first, last and recorded reorder dates
 * stand in. Computed in process; fine for pilot sizes.
 */
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Contact, Order } from "@/db/schema";
import { BENCHMARKS, compare, rangeText, type Range } from "./benchmarks";
import { isConversation, listActions } from "./insights";
import {
  SEGMENTS,
  SEGMENT_LABEL,
  SEGMENT_PLAYBOOK,
  SEGMENT_PRIORITY,
  SEGMENT_RULE,
  isCallable,
  ordersOf,
  segmentOf,
  type Segment,
} from "./segments";
import { DEFAULT_SETTINGS, getIntegration } from "./shopify/sync";
import { callDayFor, learnWindows, quantile, reorderGaps, type GapOrder, type Window } from "./windows";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";

const { contacts, calls, orders } = schema;

/** Cohorts smaller than this are shown but never flagged. */
const MIN_COHORT = 3;
/** Points below the typical cohort that count as a weak month. */
const WEAK_GAP = 0.15;
/** Columns in the heatmap, months since first order (M0..M8). */
const MAX_OFFSET = 6;

export interface HistoryOrder {
  orderedAt: string;
  product: string | null;
  total: number | null;
  discounted: boolean;
}

export interface History {
  contact: Contact;
  /** Oldest first */
  orders: HistoryOrder[];
  /** Orders on record, including ones the CSV counted but did not date */
  orderCount: number;
  /** True when dates came from the contact row, not order rows */
  synthetic: boolean;
}

/** Order dates per customer: order rows where present, else the contact's first, last and recorded reorder. */
export function orderHistory(contactRows: Contact[], orderRows: Order[]): History[] {
  const byContact = new Map<string, Order[]>();
  for (const o of orderRows) {
    if (!byContact.has(o.contactId)) byContact.set(o.contactId, []);
    byContact.get(o.contactId)!.push(o);
  }
  const out: History[] = [];
  for (const c of contactRows) {
    const real = (byContact.get(c.id) ?? []).sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
    let list: HistoryOrder[];
    let synthetic = false;
    if (real.length) {
      list = real.map((o) => ({
        orderedAt: o.orderedAt,
        product: o.product,
        total: o.total,
        discounted: Boolean(o.discounted),
      }));
    } else {
      synthetic = true;
      const dates = [c.firstOrderAt, c.lastOrderAt].filter((d): d is string => Boolean(d));
      list = [...new Set(dates)]
        .sort()
        .map((d) => ({ orderedAt: d, product: c.product, total: null, discounted: false }));
    }
    const last = list[list.length - 1]?.orderedAt;
    if (c.reorderedAt && (!last || c.reorderedAt > last)) {
      list.push({ orderedAt: c.reorderedAt, product: c.product, total: null, discounted: false });
    }
    if (list.length === 0) continue;
    out.push({ contact: c, orders: list, orderCount: Math.max(list.length, ordersOf(c)), synthetic });
  }
  return out;
}

/* ---------- Cohort curves ---------- */

export interface CohortRow {
  /** YYYY-MM of the first order */
  month: string;
  label: string;
  size: number;
  /** Whole months since the cohort month */
  ageMonths: number;
  /** cells[k] = share with a second order within k months; null when the cohort is younger than k */
  cells: Array<number | null>;
}

export interface WeakCohort {
  month: string;
  label: string;
  size: number;
  rate: number;
  typical: number;
  offset: number;
}

export interface CohortTable {
  rows: CohortRow[];
  /** Number of columns: offsets 0..columns-1 */
  columns: number;
  /** Median across cohorts old enough, per column */
  typical: Array<number | null>;
  /** Column used to compare cohorts, or null when too few are old enough */
  referenceOffset: number | null;
  weak: WeakCohort[];
}

const monthIndex = (ymd: string) => Number(ymd.slice(0, 4)) * 12 + Number(ymd.slice(5, 7)) - 1;

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Unrounded median, for rates. Day gaps use the rounded quantile from windows.ts. */
function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function cohortTable(histories: History[], now = new Date()): CohortTable {
  const nowIdx = monthIndex(now.toISOString().slice(0, 10));
  const groups = new Map<string, Array<number | null>>(); // cohort month → offset of the second order per customer
  for (const h of histories) {
    const first = h.orders[0].orderedAt;
    const second = h.orders[1]?.orderedAt ?? null;
    const month = first.slice(0, 7);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month)!.push(second ? monthIndex(second) - monthIndex(first) : null);
  }
  const months = [...groups.keys()].sort();
  const oldestAge = months.length ? nowIdx - monthIndex(`${months[0]}-01`) : 0;
  const columns = Math.min(MAX_OFFSET, Math.max(0, oldestAge)) + 1;

  const rows: CohortRow[] = months.map((month) => {
    const offsets = groups.get(month)!;
    const age = nowIdx - monthIndex(`${month}-01`);
    const cells = Array.from({ length: columns }, (_, k) =>
      k > age ? null : offsets.filter((o) => o != null && o <= k).length / offsets.length
    );
    return { month, label: monthLabel(month), size: offsets.length, ageMonths: age, cells };
  });

  const typical = Array.from({ length: columns }, (_, k) =>
    median(
      rows
        .filter((r) => r.ageMonths >= k && r.size >= MIN_COHORT && r.cells[k] != null)
        .map((r) => r.cells[k] as number)
    )
  );

  let referenceOffset: number | null = null;
  for (const k of [2, 1]) {
    if (k < columns && rows.filter((r) => r.ageMonths >= k && r.size >= MIN_COHORT).length >= 3) {
      referenceOffset = k;
      break;
    }
  }
  const weak: WeakCohort[] = [];
  if (referenceOffset != null && typical[referenceOffset] != null) {
    const t = typical[referenceOffset]!;
    for (const r of rows) {
      const v = r.cells[referenceOffset];
      if (r.ageMonths >= referenceOffset && r.size >= MIN_COHORT && v != null && v <= t - WEAK_GAP) {
        weak.push({ month: r.month, label: r.label, size: r.size, rate: v, typical: t, offset: referenceOffset });
      }
    }
    weak.sort((a, b) => a.rate - b.rate);
  }
  return { rows, columns, typical, referenceOffset, weak };
}

/* ---------- Purchase ladder ---------- */

export interface LadderStep {
  from: number;
  to: number;
  base: number;
  converted: number;
  rate: number | null;
  benchmark: Range;
  verdict: "below" | "within" | "above" | null;
}

export function purchaseLadder(histories: History[]): LadderStep[] {
  const atLeast = (n: number) => histories.filter((h) => h.orderCount >= n).length;
  const step = (from: number, benchmark: Range): LadderStep => {
    const base = atLeast(from);
    const converted = atLeast(from + 1);
    const rate = base ? converted / base : null;
    return { from, to: from + 1, base, converted, rate, benchmark, verdict: compare(rate, benchmark) };
  };
  return [step(1, BENCHMARKS.secondOrder), step(2, BENCHMARKS.thirdOrder), step(3, BENCHMARKS.fourthOrder)];
}

/* ---------- Segments ---------- */

export interface SegmentSummary {
  segment: Segment;
  label: string;
  rule: string;
  playbook: string;
  priority: number;
  customers: number;
  /** Share of customers with a purchase on record */
  share: number;
  /** Sum of order totals, when the store reports them */
  revenue: number | null;
  avgOrders: number | null;
  /** Members a campaign may dial right now */
  callable: number;
  memberIds: string[];
  callableIds: string[];
}

export function segmentSummaries(histories: History[], cycleDays: number, now = new Date()): SegmentSummary[] {
  const members = new Map<Segment, History[]>(SEGMENTS.map((s) => [s, []]));
  for (const h of histories) {
    const s = segmentOf(h.contact, cycleDays, now);
    if (s) members.get(s)!.push(h);
  }
  const total = [...members.values()].reduce((n, list) => n + list.length, 0);
  const anyTotals = histories.some((h) => h.orders.some((o) => o.total != null));
  return SEGMENTS.map((segment) => {
    const list = members.get(segment)!;
    const revenue = anyTotals ? list.reduce((s, h) => s + h.orders.reduce((t, o) => t + (o.total ?? 0), 0), 0) : null;
    const callable = list.filter((h) => isCallable(h.contact));
    return {
      segment,
      label: SEGMENT_LABEL[segment],
      rule: SEGMENT_RULE[segment],
      playbook: SEGMENT_PLAYBOOK[segment],
      priority: SEGMENT_PRIORITY[segment],
      customers: list.length,
      share: total ? list.length / total : 0,
      revenue,
      avgOrders: list.length ? list.reduce((s, h) => s + h.orderCount, 0) / list.length : null,
      callable: callable.length,
      memberIds: list.map((h) => h.contact.id),
      callableIds: callable.map((h) => h.contact.id),
    };
  });
}

/* ---------- Discount effect ---------- */

export interface DiscountEffect {
  discounted: { customers: number; repeated: number; rate: number };
  fullPrice: { customers: number; repeated: number; rate: number };
}

export function discountEffect(histories: History[]): DiscountEffect | null {
  const real = histories.filter((h) => !h.synthetic);
  const group = (flag: boolean) => {
    const list = real.filter((h) => h.orders[0].discounted === flag);
    const repeated = list.filter((h) => h.orderCount >= 2).length;
    return { customers: list.length, repeated, rate: list.length ? repeated / list.length : 0 };
  };
  const discounted = group(true);
  const fullPrice = group(false);
  if (discounted.customers < 3 || fullPrice.customers < 3) return null;
  return { discounted, fullPrice };
}

/* ---------- Week over week ---------- */

export interface WeekPair {
  label: string;
  thisWeek: number;
  lastWeek: number;
}

function weekPair(label: string, dates: Array<Date | string | null | undefined>, now: number): WeekPair {
  const d7 = now - 7 * 86_400_000;
  const d14 = now - 14 * 86_400_000;
  let thisWeek = 0;
  let lastWeek = 0;
  for (const d of dates) {
    if (!d) continue;
    const t = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime() : d.getTime();
    if (t > d7 && t <= now) thisWeek += 1;
    else if (t > d14 && t <= d7) lastWeek += 1;
  }
  return { label, thisWeek, lastWeek };
}

/* ---------- The read model ---------- */

export interface Retention {
  customers: number;
  /** Customers with at least one dated purchase */
  withPurchases: number;
  /** Order rows from the store sync */
  orderRows: number;
  storeConnected: boolean;
  /** Median days between orders across all repeat gaps; null until there are gaps */
  cycleDays: number | null;
  cycleGaps: number;
  /** Days per order configured on the store connection */
  defaultDays: number;
  /** Day after an order on which calls go out, brand-wide */
  callDay: number;
  secondOrderRate: number | null;
  cohorts: CohortTable;
  ladder: LadderStep[];
  segments: SegmentSummary[];
  windows: Window[];
  discount: DiscountEffect | null;
  week: WeekPair[];
  /** Plain sentences a retention lead can act on */
  insights: string[];
  benchmarks: typeof BENCHMARKS;
}

const pctText = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export async function getRetention(): Promise<Retention> {
  const db = getDb();
  const now = new Date();
  const [contactRows, orderRows, callRows, actionRows, integration] = await Promise.all([
    db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(5000),
    db.select().from(orders).orderBy(asc(orders.orderedAt)).limit(50_000),
    db
      .select({ call: calls, contact: contacts })
      .from(calls)
      .leftJoin(contacts, eq(calls.contactId, contacts.id))
      .orderBy(desc(calls.createdAt))
      .limit(2000),
    listActions("all", 5000),
    getIntegration("shopify"),
  ]);

  const histories = orderHistory(contactRows, orderRows);
  const defaultDays = integration?.settings?.daysPerOrder ?? DEFAULT_SETTINGS.daysPerOrder;

  const gapOrders: GapOrder[] = orderRows.map((o) => ({
    customerKey: o.contactId,
    orderedAt: o.orderedAt,
    product: o.product,
  }));
  const { all: gaps } = reorderGaps(gapOrders);
  const cycleDays = quantile(gaps, 0.5);
  const cycle = cycleDays ?? defaultDays;

  const cohorts = cohortTable(histories, now);
  const ladder = purchaseLadder(histories);
  const segments = segmentSummaries(histories, cycle, now);
  const windows = learnWindows(gapOrders, defaultDays);
  const discount = discountEffect(histories);
  const secondOrderRate = ladder[0].rate;

  const convs = callRows.filter((r) => isConversation(r.call));
  const reachedYes = convs.filter((r) => r.call.extracted?.[CATEGORY.name]?.[D.reached]?.objective === "yes");
  const nowMs = now.getTime();
  const week: WeekPair[] = [
    weekPair(
      "First orders",
      histories.map((h) => h.orders[0].orderedAt),
      nowMs
    ),
    weekPair(
      "Orders",
      orderRows.length ? orderRows.map((o) => o.orderedAt) : histories.flatMap((h) => h.orders.map((o) => o.orderedAt)),
      nowMs
    ),
    weekPair(
      "Reorders detected",
      contactRows.map((c) => c.reorderedAt),
      nowMs
    ),
    weekPair(
      "Conversations",
      convs.map((r) => r.call.createdAt),
      nowMs
    ),
    weekPair(
      "Reached",
      reachedYes.map((r) => r.call.createdAt),
      nowMs
    ),
    weekPair(
      "Follow-ups opened",
      actionRows.map((a) => a.action.createdAt),
      nowMs
    ),
    weekPair(
      "Follow-ups cleared",
      actionRows.map((a) => a.action.resolvedAt),
      nowMs
    ),
  ];

  const insights: string[] = [];
  if (secondOrderRate != null) {
    const verdict = compare(secondOrderRate, BENCHMARKS.secondOrder);
    insights.push(
      `${pctText(secondOrderRate)} of ${ladder[0].base} customers have placed a second order. D2C brands see ${rangeText(BENCHMARKS.secondOrder)}${
        verdict === "below"
          ? ", so the first-to-second gap is the problem to work on"
          : verdict === "above"
            ? ", so the base is unusually loyal"
            : ""
      }.`
    );
  }
  for (const w of cohorts.weak.slice(0, 2)) {
    insights.push(
      `Customers who first bought in ${w.label} (${w.size}) repeat at ${pctText(w.rate)} within ${w.offset} month${w.offset === 1 ? "" : "s"}; a typical month is ${pctText(w.typical)}.`
    );
  }
  if (cycleDays != null) {
    insights.push(
      `Repeat buyers reorder every ${cycleDays} days (median of ${gaps.length} gaps). Dobara calls on day ${callDayFor(cycle)}${
        windows.some((w) => w.applied) ? ", with a learned window per product where there is enough data" : ""
      }.`
    );
  } else {
    insights.push(
      `No repeat gaps on record yet. The default cycle is ${defaultDays} days, so calls go out on day ${callDayFor(defaultDays)}.`
    );
  }
  if (discount) {
    insights.push(
      `First orders with a discount code repeat at ${pctText(discount.discounted.rate)} (${discount.discounted.customers} customers) against ${pctText(discount.fullPrice.rate)} (${discount.fullPrice.customers}) at full price.`
    );
  }
  const atRisk = segments.find((s) => s.segment === "at_risk")!;
  if (atRisk.customers) {
    insights.push(
      `${atRisk.customers} repeat buyer${atRisk.customers === 1 ? " has" : "s have"} gone quiet${
        atRisk.revenue ? `, ${inr(atRisk.revenue)} of past spend` : ""
      }. ${atRisk.callable ? `${atRisk.callable} can be called now.` : "None are callable right now."}`
    );
  }

  return {
    customers: contactRows.length,
    withPurchases: histories.length,
    orderRows: orderRows.length,
    storeConnected: Boolean(integration),
    cycleDays,
    cycleGaps: gaps.length,
    defaultDays,
    callDay: callDayFor(cycle),
    secondOrderRate,
    cohorts,
    ladder,
    segments,
    windows,
    discount,
    week,
    insights,
    benchmarks: BENCHMARKS,
  };
}
