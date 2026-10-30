/**
 * Published retention ranges for consumer brands, used as context next to the
 * brand's own numbers. Ranges, not targets: category and price point move them.
 *
 * Sources: Datadrew, "Cohort analysis for Shopify" and "Retention-first growth"
 * (2026); Growwwtech, "The Indian D2C retention crisis" (2026).
 */
export interface Range {
  low: number;
  high: number;
  label: string;
}

export const BENCHMARKS = {
  /** Share of first-time buyers who ever place a second order */
  secondOrder: { low: 0.2, high: 0.35, label: "20–35% place a second order (D2C)" },
  /** Of those with two orders, share that place a third */
  thirdOrder: { low: 0.4, high: 0.6, label: "40–60% of two-time buyers buy a third time" },
  /** Of those with three orders, share that place a fourth */
  fourthOrder: { low: 0.6, high: 0.7, label: "60–70% of three-time buyers buy a fourth time" },
  /** 12-month repeat rate; consumables sit at the top of the range */
  repeat12m: { low: 0.25, high: 0.4, label: "25–40% repeat within 12 months; consumables at the top" },
  /** What Indian D2C brands typically see */
  indiaD2C: { low: 0.1, high: 0.3, label: "Indian D2C typically repeats at 10–30%" },
} satisfies Record<string, Range>;

export type BenchmarkKey = keyof typeof BENCHMARKS;

/** Where a rate sits against a range: below, within or above. */
export function compare(rate: number | null, range: Range): "below" | "within" | "above" | null {
  if (rate == null) return null;
  if (rate < range.low) return "below";
  if (rate > range.high) return "above";
  return "within";
}

export function rangeText(range: Range): string {
  return `${Math.round(range.low * 100)}–${Math.round(range.high * 100)}%`;
}
