import { bolna } from "@/lib/bolna";

export const runtime = "nodejs";

/** Proxies a Bolna call recording so the browser never needs the API key. */
export async function GET(_req: Request, ctx: { params: Promise<{ executionId: string }> }) {
  const { executionId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(executionId)) {
    return new Response("bad id", { status: 400 });
  }
  const upstream = await bolna.recordingResponse(executionId);
  if (!upstream.ok) {
    return new Response(`recording unavailable (${upstream.status})`, { status: upstream.status });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
