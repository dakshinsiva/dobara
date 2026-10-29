import { createAgentUIStreamResponse } from "ai";
import { askAgent } from "@/lib/ask-agent";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Streams an answer from the workspace analyst. Authenticates to the AI Gateway with Vercel OIDC or AI_GATEWAY_API_KEY. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null;
  if (!body || !Array.isArray(body.messages)) return jsonError("messages[] required", 400);
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN && !process.env.VERCEL) {
    return jsonError("The Ask page needs AI Gateway credentials: set AI_GATEWAY_API_KEY, or run on Vercel.", 503);
  }
  try {
    return await createAgentUIStreamResponse({ agent: askAgent, uiMessages: body.messages });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : String(err), 502);
  }
}
