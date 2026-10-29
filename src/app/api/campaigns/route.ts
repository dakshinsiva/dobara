import { NextResponse } from "next/server";
import { z } from "zod";
import { CALLABLE_COHORTS, COHORTS } from "@/db/schema";
import { jsonError } from "@/lib/http";
import { startCampaign } from "@/lib/calls";
import { errorResponse, parseJson } from "@/lib/http";

export const runtime = "nodejs";

const Body = z
  .object({
    cohort: z.enum(COHORTS).optional(),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .default({ limit: 20 });

/** Dial every eligible contact in a cohort (called group, not opted out, not called in 24 h). */
export async function POST(req: Request) {
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;
  if (parsed.data.cohort && !CALLABLE_COHORTS.includes(parsed.data.cohort)) {
    return jsonError("That cohort is never called", 400);
  }
  try {
    const result = await startCampaign(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
