import { NextResponse } from "next/server";
import type { z } from "zod";
import { BolnaError } from "./bolna";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Parse and validate a JSON body. Returns a ready 400 response on failure. */
export async function parseJson<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse }> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, res: jsonError("Invalid request body", 400, { issues: parsed.error.issues }) };
  }
  return { ok: true, data: parsed.data };
}

/** Map thrown errors to a response: Bolna upstream failures are 502, everything else 400. */
export function errorResponse(err: unknown) {
  if (err instanceof BolnaError) {
    return jsonError(err.message, 502, { upstream: err.body });
  }
  return jsonError(err instanceof Error ? err.message : String(err), 400);
}
