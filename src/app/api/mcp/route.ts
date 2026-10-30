import { NextResponse } from "next/server";
import { z } from "zod";
import { askTools } from "@/lib/ask-agent";
import { optionalEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Dobara as an MCP server (Streamable HTTP, stateless): the same read-only tools
 * the Ask page uses, for Claude, ChatGPT, Cursor and Claude Code.
 *
 * Auth: `Authorization: Bearer MCP_TOKEN`, or `?token=MCP_TOKEN` for clients that
 * cannot set headers. Unset MCP_TOKEN turns the endpoint off.
 */

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "dobara", title: "Dobara", version: "0.1.0" };

type RpcId = string | number | null;
type RpcRequest = { jsonrpc?: string; id?: RpcId; method?: string; params?: Record<string, unknown> };
type RpcResponse = { jsonrpc: "2.0"; id: RpcId; result?: unknown; error?: { code: number; message: string } };

type AnyTool = {
  description?: string;
  inputSchema: z.ZodType;
  execute: (input: unknown, options: unknown) => Promise<unknown> | unknown;
};
const TOOLS = askTools as unknown as Record<string, AnyTool>;

function authorised(req: Request, token: string): boolean {
  if (req.headers.get("authorization") === `Bearer ${token}`) return true;
  return new URL(req.url).searchParams.get("token") === token;
}

function rpcError(id: RpcId, code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolList() {
  return Object.entries(TOOLS).map(([name, t]) => {
    const schema = z.toJSONSchema(t.inputSchema) as Record<string, unknown>;
    delete schema.$schema;
    return { name, description: t.description ?? "", inputSchema: schema };
  });
}

class RpcFailure extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message);
  }
}

async function callTool(params: Record<string, unknown> | undefined) {
  const name = typeof params?.name === "string" ? params.name : "";
  const t = TOOLS[name];
  if (!t) throw new RpcFailure(-32602, `Unknown tool: ${name}`);
  const parsed = t.inputSchema.safeParse(params?.arguments ?? {});
  if (!parsed.success) {
    return { content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }], isError: true };
  }
  try {
    const result = await t.execute(parsed.data, { toolCallId: crypto.randomUUID(), messages: [], context: undefined });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result };
  } catch (err) {
    return { content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true };
  }
}

async function handle(m: RpcRequest): Promise<RpcResponse | null> {
  const id = m.id ?? null;
  if (m.jsonrpc !== "2.0" || typeof m.method !== "string") return rpcError(id, -32600, "Invalid Request");
  const notification = m.id === undefined;
  let result: unknown;
  switch (m.method) {
    case "initialize": {
      const requested = typeof m.params?.protocolVersion === "string" ? m.params.protocolVersion : "";
      result = {
        protocolVersion: PROTOCOLS.includes(requested) ? requested : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: `Read-only analyst over ${optionalEnv("BRAND_NAME", "Cosmix")}'s Dobara workspace: customers, calls and transcripts, follow-ups, retention health, cohort curves, segments, replenishment windows, reorder lift and a weekly brief. Money is in rupees unless a field says USD. Nothing here places calls or changes data.`,
      };
      break;
    }
    case "ping":
      result = {};
      break;
    case "tools/list":
      result = { tools: toolList() };
      break;
    case "tools/call":
      result = await callTool(m.params);
      break;
    case "resources/list":
      result = { resources: [] };
      break;
    case "resources/templates/list":
      result = { resourceTemplates: [] };
      break;
    case "prompts/list":
      result = { prompts: [] };
      break;
    default:
      if (notification) return null; // notifications/initialized, notifications/cancelled, …
      return rpcError(id, -32601, `Method not found: ${m.method}`);
  }
  return notification ? null : { jsonrpc: "2.0", id, result };
}

export async function POST(req: Request) {
  const token = process.env.MCP_TOKEN;
  if (!token) return NextResponse.json({ error: "MCP is off. Set MCP_TOKEN to enable it." }, { status: 503 });
  if (!authorised(req, token)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="dobara"' } }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }
  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]) as RpcRequest[];
  const responses: RpcResponse[] = [];
  for (const m of messages) {
    try {
      const r = await handle(m ?? {});
      if (r) responses.push(r);
    } catch (err) {
      const code = err instanceof RpcFailure ? err.code : -32603;
      responses.push(rpcError(m?.id ?? null, code, err instanceof Error ? err.message : String(err)));
    }
  }
  if (responses.length === 0) return new Response(null, { status: 202 });
  return NextResponse.json(batch ? responses : responses[0]);
}

/** No server-initiated stream in stateless mode; clients POST JSON-RPC. */
export async function GET() {
  return NextResponse.json(
    { error: "POST JSON-RPC 2.0 to this URL. Dobara's MCP server is stateless and does not open a server stream." },
    { status: 405, headers: { Allow: "POST, DELETE" } }
  );
}

/** Session termination is a no-op: there are no sessions. */
export async function DELETE() {
  return new Response(null, { status: 204 });
}
