import { NextResponse } from "next/server";
import { z } from "zod";
import { CALLABLE_COHORTS, COHORTS } from "@/db/schema";
import { startCampaign } from "@/lib/calls";
import { errorResponse, jsonError, parseJson } from "@/lib/http";
import { getRetention } from "@/lib/retention";
import { SEGMENTS } from "@/lib/segments";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z
  .object({
    cohort: z.enum(COHORTS).optional(),
    segment: z.enum(SEGMENTS).optional(),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .default({ limit: 20 });

/**
 * Dial every eligible contact in a cohort or a segment
 * (called group, not opted out, callable cohort, not called in 24 h).
 */
export async function POST(req: Request) {
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return parsed.res;
  const { cohort, segment, limit } = parsed.data;
  if (cohort && !CALLABLE_COHORTS.includes(cohort)) {
    return jsonError("That cohort is never called", 400);
  }
  try {
    let contactIds: string[] | undefined;
    if (segment) {
      const r = await getRetention();
      contactIds = r.segments.find((s) => s.segment === segment)?.callableIds ?? [];
    }
    const result = await startCampaign({ cohort, contactIds, limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
