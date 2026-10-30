/**
 * Store sync: pull orders, snapshot customers, assign cohorts, upsert contacts,
 * detect reorders for the lift metric, and record a summary on the integration.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Integration, IntegrationSettings, SyncSummary } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { optionalEnv, toE164 } from "@/lib/env";
import { assignGroup } from "@/lib/split";
import { appliedWindows, learnWindows } from "@/lib/windows";
import { ShopifyClient, isSampleStore, normaliseShop } from "./client";
import { assignCohort, guessLanguage, snapshotCustomers, type CustomerSnapshot } from "./cohorts";

const { contacts, integrations, orders } = schema;

export const DEFAULT_SETTINGS: IntegrationSettings = {
  calledShare: 0.7,
  daysPerOrder: 30,
  defaultLanguage: "en",
  lookbackDays: 365,
};

export async function getIntegration(provider = "shopify"): Promise<Integration | null> {
  const db = getDb();
  const [row] = await db.select().from(integrations).where(eq(integrations.provider, provider)).limit(1);
  return row ?? null;
}

/** Validate the token against the store, then save it encrypted. */
export async function connectShopify(input: {
  shop: string;
  token: string;
  settings?: Partial<IntegrationSettings>;
}): Promise<{ shop: string; shopName: string }> {
  const shop = normaliseShop(input.shop);
  const client = new ShopifyClient(shop, input.token);
  const shopName = await client.shopName();
  const settings = { ...DEFAULT_SETTINGS, ...input.settings };

  const db = getDb();
  await db
    .insert(integrations)
    .values({ provider: "shopify", shop, shopName, tokenEncrypted: encrypt(input.token), settings })
    .onConflictDoUpdate({
      target: integrations.provider,
      set: { shop, shopName, tokenEncrypted: encrypt(input.token), settings, updatedAt: new Date() },
    });
  return { shop, shopName };
}

export async function disconnectShopify(): Promise<void> {
  const db = getDb();
  await db.delete(integrations).where(eq(integrations.provider, "shopify"));
}

export async function syncShopify(): Promise<SyncSummary> {
  const db = getDb();
  const integration = await getIntegration("shopify");
  if (!integration) throw new Error("No Shopify store connected");
  const settings = { ...DEFAULT_SETTINGS, ...integration.settings };
  const client = new ShopifyClient(integration.shop, decrypt(integration.tokenEncrypted));
  const brand = optionalEnv("BRAND_NAME") || integration.shopName || "Cosmix";

  const summary: SyncSummary = {
    at: new Date().toISOString(),
    orders: 0,
    customers: 0,
    inserted: 0,
    updated: 0,
    reorders: 0,
    skipped: 0,
    byCohort: {},
  };

  try {
    const since = new Date(Date.now() - settings.lookbackDays * 86_400_000);
    const fetched = await client.orders(since);
    summary.orders = fetched.length;
    const snapshots = snapshotCustomers(fetched);
    summary.customers = snapshots.length;

    // Days per order learned from repeat gaps replaces the default once a product has enough of them.
    const learned = appliedWindows(
      learnWindows(
        snapshots.flatMap((s) =>
          s.orders.map((o) => ({
            customerKey: s.rawPhone.replace(/\D/g, ""),
            orderedAt: o.orderedAt,
            product: o.product,
          }))
        ),
        settings.daysPerOrder
      )
    );
    summary.windows = learned;

    for (const s of snapshots) {
      const phone = toE164(s.rawPhone);
      if (!phone) {
        summary.skipped += 1;
        continue;
      }
      const daysPerOrder = (s.product && learned[s.product]) || settings.daysPerOrder;
      const cohort = assignCohort(s, { daysPerOrder });
      summary.byCohort[cohort] = (summary.byCohort[cohort] ?? 0) + 1;

      const [existing] = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
      let contactId: string;
      if (existing) {
        contactId = existing.id;
        const reordered = await detectReorder(existing, s, isSampleStore(integration.shop));
        if (reordered) summary.reorders += 1;
        await db
          .update(contacts)
          .set({
            name: existing.source === "csv" ? existing.name : s.name,
            product: s.product ?? existing.product,
            flavour: s.flavour ?? existing.flavour,
            lastOrderAt: s.lastOrderAt,
            firstOrderAt: existing.firstOrderAt ?? s.firstOrderAt,
            deliveredAt: s.deliveredAt,
            orderCount: s.orderCount,
            cohort,
            externalId: s.externalId ?? existing.externalId,
            ...(reordered ? { reorderedAt: s.lastOrderAt, reorderSource: "shopify" } : {}),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, existing.id));
        summary.updated += 1;
      } else {
        const [row] = await db
          .insert(contacts)
          .values({
            name: s.name,
            phone,
            language: guessLanguage(s.provinceCode, settings.defaultLanguage),
            cohort,
            group: assignGroup(phone, settings.calledShare),
            brand,
            product: s.product,
            flavour: s.flavour,
            lastOrderAt: s.lastOrderAt,
            firstOrderAt: s.firstOrderAt,
            deliveredAt: s.deliveredAt,
            orderCount: s.orderCount,
            source: "shopify",
            externalId: s.externalId,
          })
          .returning({ id: contacts.id });
        contactId = row.id;
        summary.inserted += 1;
      }
      await upsertOrders(contactId, s);
    }
  } catch (err) {
    summary.error = err instanceof Error ? err.message : String(err);
    await db
      .update(integrations)
      .set({ lastSyncSummary: summary, updatedAt: new Date() })
      .where(eq(integrations.id, integration.id));
    throw err;
  }

  await db
    .update(integrations)
    .set({ lastSyncAt: new Date(), lastSyncSummary: summary, updatedAt: new Date() })
    .where(eq(integrations.id, integration.id));
  return summary;
}

/**
 * A reorder is an order we have not stored before, placed after the last order on
 * file. Before any orders are stored for the customer (first sync after the orders
 * table arrived) the dates alone decide, except for the sample store, whose dates
 * move with the calendar and would otherwise count as a reorder every day.
 */
async function detectReorder(
  existing: { id: string; lastOrderAt: string | null },
  s: CustomerSnapshot,
  sample: boolean
): Promise<boolean> {
  if (!existing.lastOrderAt || s.lastOrderAt <= existing.lastOrderAt) return false;
  const db = getDb();
  const ids = s.orders.map((o) => o.externalId);
  const stored = ids.length
    ? await db.select({ externalId: orders.externalId }).from(orders).where(inArray(orders.externalId, ids))
    : [];
  if (stored.length === 0) return !sample;
  const seen = new Set(stored.map((r) => r.externalId));
  return s.orders.some((o) => !seen.has(o.externalId) && o.orderedAt > existing.lastOrderAt!);
}

/** Store every order of the customer; re-syncs update totals and delivery dates in place. */
async function upsertOrders(contactId: string, s: CustomerSnapshot): Promise<void> {
  if (s.orders.length === 0) return;
  const db = getDb();
  await db
    .insert(orders)
    .values(
      s.orders.map((o) => ({
        contactId,
        externalId: o.externalId,
        orderedAt: o.orderedAt,
        deliveredAt: o.deliveredAt,
        product: o.product,
        flavour: o.flavour,
        quantity: o.quantity,
        total: o.total,
        currency: o.currency,
        discounted: o.discounted ? 1 : 0,
        source: "shopify" as const,
      }))
    )
    .onConflictDoUpdate({
      target: orders.externalId,
      set: {
        contactId,
        orderedAt: sql`excluded.ordered_at`,
        deliveredAt: sql`excluded.delivered_at`,
        product: sql`excluded.product`,
        flavour: sql`excluded.flavour`,
        quantity: sql`excluded.quantity`,
        total: sql`excluded.total`,
        currency: sql`excluded.currency`,
        discounted: sql`excluded.discounted`,
      },
    });
}
