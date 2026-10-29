import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { toE164 } from "@/lib/env";
import { errorResponse, parseJson } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({
  /** Phone numbers of customers who placed a repeat order, any format. */
  phones: z.array(z.string().min(6)).min(1).max(5000),
  /** YYYY-MM-DD; defaults to today. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  source: z.string().max(40).default("import"),
});

/**
 * Record repeat orders from the brand's order export. Both called and control
 * customers are matched, which is what makes the lift comparison fair.
 */
export async function POST(req: Request) {
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;
  const { phones, source } = parsed.data;
  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

  try {
    const db = getDb();
    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const raw of phones) {
      const phone = toE164(raw);
      if (!phone) {
        unmatched.push(raw);
        continue;
      }
      const rows = await db
        .update(schema.contacts)
        .set({ reorderedAt: date, reorderSource: source, updatedAt: new Date() })
        .where(eq(schema.contacts.phone, phone))
        .returning({ id: schema.contacts.id });
      (rows.length ? matched : unmatched).push(phone);
    }
    return NextResponse.json({ ok: true, date, matched: matched.length, unmatched });
  } catch (err) {
    return errorResponse(err);
  }
}
