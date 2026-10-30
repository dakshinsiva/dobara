import { date, integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const LANGUAGES = ["en", "hi", "kn", "ta"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * new = first order delivered 4 to 7 days ago · running_low = due to run out · lapsed = 60+ days
 * active = bought recently, not due yet (never called by campaigns)
 */
export const COHORTS = ["new", "running_low", "lapsed", "active"] as const;
export type Cohort = (typeof COHORTS)[number];

/** Cohorts a campaign may dial. */
export const CALLABLE_COHORTS: readonly Cohort[] = ["new", "running_low", "lapsed"];

export const SOURCES = ["csv", "shopify"] as const;
export type Source = (typeof SOURCES)[number];

export const GROUPS = ["called", "control"] as const;
export type Group = (typeof GROUPS)[number];

/** How a conversation reached the customer. */
export const CHANNELS = ["phone", "web"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Follow-ups the brand's team must do after a call. Derived from extractions. */
export const ACTION_TYPES = [
  "send_link", // customer agreed to a WhatsApp reorder link
  "callback_human", // asked to speak to a person
  "callback_later", // asked to be called at another time
  "cx_followup", // unhappy, or a delivery / results problem
  "red_flag", // do_not_call, health_complaint, angry, wrong_number
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_STATUSES = ["open", "done"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** E.164, e.g. +919876543210 */
  phone: text("phone").notNull().unique(),
  language: text("language").$type<Language>().notNull().default("en"),
  cohort: text("cohort").$type<Cohort>().notNull().default("running_low"),
  /** called = gets the call; control = never called, used to measure lift */
  group: text("cohort_group").$type<Group>().notNull().default("called"),
  brand: text("brand").notNull().default("Cosmix"),
  product: text("product"),
  flavour: text("flavour"),
  lastOrderAt: date("last_order_at"),
  firstOrderAt: date("first_order_at"),
  /** When the latest order was delivered, if the store reports it */
  deliveredAt: date("delivered_at"),
  orderCount: integer("order_count").notNull().default(0),
  /** Where the row came from: csv import or a store sync */
  source: text("source").$type<Source>().notNull().default("csv"),
  /** The store's customer id, for store syncs */
  externalId: text("external_id"),
  /** Set when the brand records a repeat order (import or manual). Drives the lift metric. */
  reorderedAt: date("reordered_at"),
  reorderSource: text("reorder_source"),
  /** What the agent should remember from the previous call */
  lastSummary: text("last_summary"),
  doNotCall: integer("do_not_call").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One order per row, from the store sync. Drives cohort curves, replenishment windows and segments. */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  /** The store's order id (gid://shopify/Order/123) */
  externalId: text("external_id").notNull().unique(),
  orderedAt: date("ordered_at").notNull(),
  deliveredAt: date("delivered_at"),
  product: text("product"),
  flavour: text("flavour"),
  quantity: integer("quantity").notNull().default(1),
  /** Order total in the store's currency, when the store reports it */
  total: real("total"),
  currency: text("currency"),
  /** 1 when a discount code was used */
  discounted: integer("discounted").notNull().default(0),
  source: text("source").$type<Source>().notNull().default("shopify"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  /** Bolna execution id (run_id for browser calls) */
  executionId: text("execution_id").unique(),
  channel: text("channel").$type<Channel>().notNull().default("phone"),
  status: text("status").notNull().default("queued"),
  conversationDuration: integer("conversation_duration").notNull().default(0),
  transcript: text("transcript"),
  summary: text("summary"),
  /** Bolna extracted_data: { category: { disposition: { subjective, objective, confidence, ... } } } */
  extracted: jsonb("extracted").$type<ExtractedData>(),
  recordingUrl: text("recording_url"),
  totalCostCents: real("total_cost_cents"),
  hangupReason: text("hangup_reason"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const actions = pgTable("actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  callId: uuid("call_id").references(() => calls.id, { onDelete: "cascade" }),
  type: text("type").$type<ActionType>().notNull(),
  /** Short human-readable detail, e.g. the red-flag value or the customer's complaint */
  detail: text("detail"),
  status: text("status").$type<ActionStatus>().notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type IntegrationSettings = {
  /** Share of customers that get called; the rest form the control group */
  calledShare: number;
  /** How many days one order typically lasts; drives the running-low cohort */
  daysPerOrder: number;
  /** Language for customers whose state gives no hint */
  defaultLanguage: Language;
  /** How far back to read orders on each sync */
  lookbackDays: number;
};

export type SyncSummary = {
  at: string;
  orders: number;
  customers: number;
  inserted: number;
  updated: number;
  reorders: number;
  skipped: number;
  byCohort: Record<string, number>;
  /** Days per order learned from repeat gaps, per product; applied when the sample is big enough */
  windows?: Record<string, number>;
  error?: string;
};

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull().unique(),
  /** Store host, e.g. cosmix.myshopify.com, or a full URL for the built-in sample store */
  shop: text("shop").notNull(),
  shopName: text("shop_name"),
  tokenEncrypted: text("token_encrypted").notNull(),
  settings: jsonb("settings").$type<IntegrationSettings>().notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncSummary: jsonb("last_sync_summary").$type<SyncSummary>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExtractionResult = {
  subjective: string | null;
  objective: string | null;
  confidence: number | null;
  confidence_label: string | null;
  reasoning_subjective?: string | null;
  reasoning_objective?: string | null;
  validation?: unknown;
};

export type ExtractedData = Record<string, Record<string, ExtractionResult>>;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;
export type Integration = typeof integrations.$inferSelect;
