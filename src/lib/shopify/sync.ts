/**
 * Store sync: pull orders, snapshot customers, assign cohorts, upsert contacts,
 * detect reorders for the lift metric, and record a summary on the integration.
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Integration, IntegrationSettings, SyncSummary } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { optionalEnv, toE164 } from "@/lib/env";
import { assignGroup } from "@/lib/split";
import { ShopifyClient, normaliseShop } from "./client";
import { assignCohort, guessLanguage, snapshotCustomers } from "./cohorts";

const { contacts, integrations } = schema;

export const DEFAULT_SETTINGS: IntegrationSettings = {
  calledShare: 0.7,
  daysPerOrder: 30,
  defaultLanguage: "en",
  lookbackDays: 180,
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
    const orders = await client.orders(since);
    summary.orders = orders.length;
    const snapshots = snapshotCustomers(orders);
    summary.customers = snapshots.length;

    for (const s of snapshots) {
      const phone = toE164(s.rawPhone);
      if (!phone) {
        summary.skipped += 1;
        continue;
      }
      const cohort = assignCohort(s, settings);
      summary.byCohort[cohort] = (summary.byCohort[cohort] ?? 0) + 1;

      const [existing] = await db.select().from(contacts).where(eq(contacts.phone, phone)).limit(1);
      if (existing) {
        const reordered = Boolean(existing.lastOrderAt && s.lastOrderAt > existing.lastOrderAt);
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
        await db.insert(contacts).values({
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
        });
        summary.inserted += 1;
      }
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
