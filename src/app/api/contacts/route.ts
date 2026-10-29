import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { COHORTS, LANGUAGES, type Cohort, type Group, type Language } from "@/db/schema";
import { toE164 } from "@/lib/env";

export const runtime = "nodejs";

const { contacts } = schema;

const Row = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  language: z.enum(LANGUAGES).optional(),
  cohort: z.enum(COHORTS).optional(),
  group: z.enum(["called", "control"]).optional(),
  brand: z.string().optional(),
  product: z.string().optional(),
  flavour: z.string().optional(),
  last_order_at: z.string().optional(), // YYYY-MM-DD
});

const Body = z.object({
  rows: z.array(Row).min(1),
  /** Share of rows that get called; the rest become the control group. */
  calledShare: z.number().min(0).max(1).default(0.7),
});

/** Stable hash so the same phone always lands in the same group across re-imports. */
function hashToUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(500);
  return NextResponse.json({ contacts: rows });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { rows, calledShare } = parsed.data;

  const values = [];
  const skipped: string[] = [];
  for (const r of rows) {
    const phone = toE164(r.phone);
    if (!phone) {
      skipped.push(r.phone);
      continue;
    }
    const group: Group = r.group ?? (hashToUnit(phone) < calledShare ? "called" : "control");
    values.push({
      name: r.name.trim(),
      phone,
      language: (r.language ?? "en") as Language,
      cohort: (r.cohort ?? "running_low") as Cohort,
      group,
      brand: r.brand?.trim() || process.env.BRAND_NAME || "Cosmix",
      product: r.product?.trim() || null,
      flavour: r.flavour?.trim() || null,
      lastOrderAt: r.last_order_at && /^\d{4}-\d{2}-\d{2}$/.test(r.last_order_at) ? r.last_order_at : null,
    });
  }

  if (values.length === 0) {
    return NextResponse.json({ error: "no valid phone numbers", skipped }, { status: 400 });
  }

  const db = getDb();
  const inserted = await db
    .insert(contacts)
    .values(values)
    .onConflictDoUpdate({
      target: contacts.phone,
      set: {
        name: sql`excluded.name`,
        language: sql`excluded.language`,
        cohort: sql`excluded.cohort`,
        brand: sql`excluded.brand`,
        product: sql`excluded.product`,
        flavour: sql`excluded.flavour`,
        lastOrderAt: sql`excluded.last_order_at`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: contacts.id, group: contacts.group });

  const called = inserted.filter((r) => r.group === "called").length;
  return NextResponse.json({
    ok: true,
    imported: inserted.length,
    called,
    control: inserted.length - called,
    skipped,
  });
}
