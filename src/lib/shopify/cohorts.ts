/**
 * Pure cohort logic: orders in, customer snapshots and cohorts out. No I/O.
 */
import type { Cohort, IntegrationSettings, Language } from "@/db/schema";
import type { ShopifyOrder } from "./client";

/** ISO 3166-2:IN province codes Shopify uses → the language most customers there speak. */
const STATE_LANGUAGE: Record<string, Language> = {
  KA: "kn",
  TN: "ta",
  DL: "hi",
  UP: "hi",
  MP: "hi",
  RJ: "hi",
  BR: "hi",
  HR: "hi",
  JH: "hi",
  CT: "hi",
  UT: "hi",
  HP: "hi",
};

export function guessLanguage(provinceCode: string | null | undefined, fallback: Language): Language {
  return (provinceCode && STATE_LANGUAGE[provinceCode.toUpperCase()]) || fallback;
}

export type CustomerSnapshot = {
  externalId: string | null;
  name: string;
  rawPhone: string;
  provinceCode: string | null;
  orderCount: number;
  firstOrderAt: string; // YYYY-MM-DD
  lastOrderAt: string;
  deliveredAt: string | null;
  product: string | null;
  flavour: string | null;
};

const day = (iso: string) => iso.slice(0, 10);

function phoneOf(o: ShopifyOrder): string | null {
  return o.customer?.phone || o.shippingAddress?.phone || o.customer?.defaultAddress?.phone || null;
}

function nameOf(o: ShopifyOrder): string {
  const shipping = [o.shippingAddress?.firstName, o.shippingAddress?.lastName].filter(Boolean).join(" ").trim();
  return o.customer?.displayName?.trim() || shipping || "Customer";
}

function deliveredAtOf(o: ShopifyOrder): string | null {
  for (const f of o.fulfillments ?? []) {
    if (f.deliveredAt) return day(f.deliveredAt);
    if (f.displayStatus === "DELIVERED") return day(f.updatedAt);
  }
  return null;
}

function productOf(o: ShopifyOrder): { product: string | null; flavour: string | null } {
  const li = o.lineItems?.nodes?.[0];
  if (!li) return { product: null, flavour: null };
  const flavour = li.variantTitle && li.variantTitle !== "Default Title" ? li.variantTitle : null;
  return { product: li.title, flavour };
}

/** Group orders by customer phone. The newest order supplies product and delivery. */
export function snapshotCustomers(orders: ShopifyOrder[]): CustomerSnapshot[] {
  const byPhone = new Map<string, ShopifyOrder[]>();
  for (const o of orders) {
    if (o.cancelledAt) continue;
    const phone = phoneOf(o);
    if (!phone) continue;
    const key = phone.replace(/\D/g, "");
    if (!byPhone.has(key)) byPhone.set(key, []);
    byPhone.get(key)!.push(o);
  }
  const out: CustomerSnapshot[] = [];
  for (const group of byPhone.values()) {
    group.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = group[0];
    const oldest = group[group.length - 1];
    out.push({
      externalId: latest.customer?.id ?? null,
      name: nameOf(latest),
      rawPhone: phoneOf(latest)!,
      provinceCode: latest.shippingAddress?.provinceCode ?? latest.customer?.defaultAddress?.provinceCode ?? null,
      orderCount: group.length,
      firstOrderAt: day(oldest.createdAt),
      lastOrderAt: day(latest.createdAt),
      deliveredAt: deliveredAtOf(latest),
      ...productOf(latest),
    });
  }
  return out;
}

function daysBetween(fromYmd: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(`${fromYmd}T00:00:00Z`).getTime()) / 86_400_000);
}

/**
 * new: first order, delivered 4 to 7 days ago (or ordered 7 to 10 days ago when delivery is unknown)
 * lapsed: 60 days or more since the last order
 * running_low: 80% of the way through the expected days per order
 * active: everything else (bought recently, not due yet)
 */
export function assignCohort(
  s: Pick<CustomerSnapshot, "orderCount" | "lastOrderAt" | "deliveredAt">,
  settings: Pick<IntegrationSettings, "daysPerOrder">,
  now = new Date()
): Cohort {
  const sinceOrder = daysBetween(s.lastOrderAt, now);
  const sinceDelivery = s.deliveredAt ? daysBetween(s.deliveredAt, now) : null;

  if (s.orderCount === 1) {
    if (sinceDelivery != null && sinceDelivery >= 4 && sinceDelivery <= 7) return "new";
    if (sinceDelivery == null && sinceOrder >= 7 && sinceOrder <= 10) return "new";
  }
  if (sinceOrder >= 60) return "lapsed";
  if (sinceOrder >= Math.round(settings.daysPerOrder * 0.8)) return "running_low";
  return "active";
}
