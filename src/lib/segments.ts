/**
 * RFM-style segments, read through a replenishment lens. Recency is measured in
 * reorder cycles (the brand's median gap between orders), frequency in orders,
 * and each segment maps to what Dobara does on the phone. Pure; no I/O.
 */
import type { Contact } from "@/db/schema";
import { CALLABLE_COHORTS } from "@/db/schema";
import type { Tone } from "./labels";

export const SEGMENTS = ["champions", "loyal", "promising", "at_risk", "hibernating", "lost"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABEL: Record<Segment, string> = {
  champions: "Champions",
  loyal: "Loyal",
  promising: "Promising",
  at_risk: "At risk",
  hibernating: "Hibernating",
  lost: "Lost",
};

export const SEGMENT_RULE: Record<Segment, string> = {
  champions: "3+ orders, bought within 1.5 cycles",
  loyal: "2 orders, bought within 1.5 cycles",
  promising: "First order, within 1.5 cycles",
  at_risk: "Repeat buyer, overdue by more than half a cycle",
  hibernating: "One order, overdue, never came back",
  lost: "No order for 90 days or 3 cycles",
};

/** What the agent does for each segment; the voice-first answer to "sync the segment to Klaviyo". */
export const SEGMENT_PLAYBOOK: Record<Segment, string> = {
  champions:
    "Replenishment call only when they run low. Otherwise a thank-you and a referral ask once a quarter; first to hear about new flavours.",
  loyal: "Replenishment call when they run low. Mention the next flavour; confirm the WhatsApp link.",
  promising: "Day-5 check-in after delivery: did it arrive, how to use it, anything in the way of a second order.",
  at_risk: "Win-back call now. Ask what changed, fix it if it is fixable, send the reorder link.",
  hibernating: "One call to learn why there was no second order. The answer feeds “why customers leave”.",
  lost: "Low priority. One attempt with the offer; honour do-not-call immediately.",
};

export const SEGMENT_TONE: Record<Segment, Tone> = {
  champions: "good",
  loyal: "good",
  promising: "info",
  at_risk: "warning",
  hibernating: "warning",
  lost: "danger",
};

/** Call priority for campaigns; lower calls first. */
export const SEGMENT_PRIORITY: Record<Segment, number> = {
  at_risk: 1,
  promising: 2,
  hibernating: 3,
  loyal: 4,
  lost: 5,
  champions: 6,
};

export function ordersOf(c: Pick<Contact, "orderCount" | "lastOrderAt">): number {
  return Math.max(c.orderCount, c.lastOrderAt ? 1 : 0);
}

function daysSince(ymd: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(`${ymd}T00:00:00Z`).getTime()) / 86_400_000));
}

/**
 * Segment of one customer given the brand's reorder cycle in days.
 * Null when the customer has no purchase on record.
 */
export function segmentOf(
  c: Pick<Contact, "orderCount" | "lastOrderAt">,
  cycleDays: number,
  now = new Date()
): Segment | null {
  const n = ordersOf(c);
  if (n === 0 || !c.lastOrderAt) return null;
  const recency = daysSince(c.lastOrderAt, now);
  const cycle = Math.max(7, cycleDays);
  const window = Math.round(cycle * 1.5);
  const lostAfter = Math.max(90, cycle * 3);
  if (recency >= lostAfter) return "lost";
  if (recency <= window) return n >= 3 ? "champions" : n === 2 ? "loyal" : "promising";
  return n >= 2 ? "at_risk" : "hibernating";
}

/** A customer a campaign may dial: called group, not opted out, in a callable lifecycle cohort. */
export function isCallable(c: Pick<Contact, "group" | "doNotCall" | "cohort">): boolean {
  return c.group === "called" && !c.doNotCall && CALLABLE_COHORTS.includes(c.cohort);
}

export function isSegment(value: string | undefined | null): value is Segment {
  return (SEGMENTS as readonly string[]).includes(value ?? "");
}
