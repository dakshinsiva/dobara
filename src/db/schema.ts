import {
  date,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const LANGUAGES = ["en", "hi", "kn", "ta"] as const;
export type Language = (typeof LANGUAGES)[number];

export const COHORTS = ["new", "running_low", "lapsed"] as const;
export type Cohort = (typeof COHORTS)[number];

export const GROUPS = ["called", "control"] as const;
export type Group = (typeof GROUPS)[number];

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
  /** What the agent should remember from the previous call */
  lastSummary: text("last_summary"),
  doNotCall: integer("do_not_call").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  /** Bolna execution id */
  executionId: text("execution_id").unique(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
