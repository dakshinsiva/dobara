import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ACTION_STATUSES } from "@/db/schema";
import { errorResponse, jsonError, parseJson } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({ status: z.enum(ACTION_STATUSES) });

/** Mark a follow-up action open or done. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;
  try {
    const db = getDb();
    const [row] = await db
      .update(schema.actions)
      .set({ status: parsed.data.status, resolvedAt: parsed.data.status === "done" ? new Date() : null })
      .where(eq(schema.actions.id, id))
      .returning();
    if (!row) return jsonError("Action not found", 404);
    return NextResponse.json({ ok: true, action: row });
  } catch (err) {
    return errorResponse(err);
  }
}
