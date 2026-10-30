/**
 * Replenishment windows learned from repeat gaps: how many days one order lasts,
 * per product, and therefore the day Dobara should call. Pure; no I/O.
 */

/** Gaps needed before a learned window replaces the default days-per-order. */
export const MIN_GAPS = 8;
/** Gaps longer than this are a new relationship, not a replenishment. */
const MAX_GAP_DAYS = 400;
/** Call when this share of the cycle has elapsed (day 26 of a 32-day cycle). */
export const CALL_AT = 0.8;

export interface GapOrder {
  /** Anything stable per customer: contact id or phone digits */
  customerKey: string;
  /** YYYY-MM-DD */
  orderedAt: string;
  product: string | null;
}

export interface Window {
  product: string;
  /** Customers who bought this product */
  customers: number;
  /** Repeat gaps observed for this product */
  gaps: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  /** Days per order in force: the learned median when applied, otherwise the default */
  daysPerOrder: number;
  /** Day after the last order on which Dobara calls */
  callDay: number;
  applied: boolean;
}

export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(s[lo] + (s[hi] - s[lo]) * (pos - lo));
}

const dayOf = (ymd: string) => Math.floor(new Date(`${ymd.slice(0, 10)}T00:00:00Z`).getTime() / 86_400_000);

/**
 * Gaps between consecutive orders of the same customer. A gap counts for a
 * product when both orders are that product; every gap counts for the brand.
 */
export function reorderGaps(orders: GapOrder[]): { byProduct: Map<string, number[]>; all: number[] } {
  const byCustomer = new Map<string, GapOrder[]>();
  for (const o of orders) {
    if (!byCustomer.has(o.customerKey)) byCustomer.set(o.customerKey, []);
    byCustomer.get(o.customerKey)!.push(o);
  }
  const byProduct = new Map<string, number[]>();
  const all: number[] = [];
  for (const list of byCustomer.values()) {
    list.sort((a, b) => a.orderedAt.localeCompare(b.orderedAt));
    for (let i = 1; i < list.length; i++) {
      const gap = dayOf(list[i].orderedAt) - dayOf(list[i - 1].orderedAt);
      if (gap <= 0 || gap > MAX_GAP_DAYS) continue;
      all.push(gap);
      const p = list[i].product;
      if (p && list[i - 1].product === p) {
        if (!byProduct.has(p)) byProduct.set(p, []);
        byProduct.get(p)!.push(gap);
      }
    }
  }
  return { byProduct, all };
}

export function callDayFor(daysPerOrder: number): number {
  return Math.max(1, Math.round(daysPerOrder * CALL_AT));
}

/** One window per product seen in the orders, learned when there are enough gaps. */
export function learnWindows(orders: GapOrder[], defaultDays: number): Window[] {
  const { byProduct } = reorderGaps(orders);
  const customersByProduct = new Map<string, Set<string>>();
  for (const o of orders) {
    if (!o.product) continue;
    if (!customersByProduct.has(o.product)) customersByProduct.set(o.product, new Set());
    customersByProduct.get(o.product)!.add(o.customerKey);
  }
  return [...customersByProduct.entries()]
    .map(([product, customers]) => {
      const gaps = byProduct.get(product) ?? [];
      const median = quantile(gaps, 0.5);
      const applied = gaps.length >= MIN_GAPS && median != null;
      const daysPerOrder = applied ? Math.min(365, Math.max(7, median!)) : defaultDays;
      return {
        product,
        customers: customers.size,
        gaps: gaps.length,
        median,
        p25: quantile(gaps, 0.25),
        p75: quantile(gaps, 0.75),
        daysPerOrder,
        callDay: callDayFor(daysPerOrder),
        applied,
      };
    })
    .sort((a, b) => b.customers - a.customers);
}

/** Learned days per order, keyed by product, for the windows that are in force. */
export function appliedWindows(windows: Window[]): Record<string, number> {
  return Object.fromEntries(windows.filter((w) => w.applied).map((w) => [w.product, w.daysPerOrder]));
}
