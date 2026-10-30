// Checks a Dobara MCP endpoint end to end: auth, initialize, tools/list, every
// read tool, error codes, batching, query-string auth, GET and DELETE.
// Run: pnpm mcp:check                       (MCP_URL defaults to http://localhost:3000/api/mcp, MCP_TOKEN from .env.local)
//      MCP_URL=https://dobara-app.vercel.app/api/mcp MCP_TOKEN=... pnpm mcp:check

const url = process.env.MCP_URL || "http://localhost:3000/api/mcp";
const token = process.env.MCP_TOKEN;
if (!token) {
  console.error("MCP_TOKEN is missing (set it in .env.local or the environment)");
  process.exit(1);
}
const auth = { Authorization: `Bearer ${token}` };
const results = [];
let id = 0;

async function call(body, { headers = {}, target = url, method = "POST" } = {}) {
  const res = await fetch(target, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}
const rpc = (method, params) => ({ jsonrpc: "2.0", id: ++id, method, ...(params ? { params } : {}) });
const tool = (name, args = {}) => rpc("tools/call", { name, arguments: args });
const content = (r) => r.body?.result?.structuredContent ?? null;
function check(name, ok, note = "") {
  results.push({ name, ok, note });
}

let r = await call(rpc("ping"));
check("no token → 401", r.status === 401);

r = await call(
  rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check", version: "0" } }),
  { headers: auth }
);
check(
  "initialize",
  r.status === 200 && r.body?.result?.protocolVersion === "2025-06-18" && r.body?.result?.serverInfo?.name === "dobara",
  `${r.body?.result?.protocolVersion ?? r.status} ${r.body?.result?.serverInfo?.name ?? ""}`
);

r = await call({ jsonrpc: "2.0", method: "notifications/initialized" }, { headers: auth });
check("initialized notification → 202", r.status === 202, String(r.status));

r = await call(rpc("tools/list"), { headers: auth });
const tools = r.body?.result?.tools ?? [];
check(
  "tools/list: 11 tools, object schemas",
  r.status === 200 && tools.length === 11 && tools.every((t) => t.inputSchema?.type === "object"),
  tools.map((t) => t.name).join(", ")
);

r = await call(tool("retention_health"), { headers: auth });
let c = content(r);
check(
  "retention_health",
  r.status === 200 && c?.customers > 0,
  c
    ? `customers=${c.customers} lifecycle=${JSON.stringify(c.lifecycle)} lift ${c.lift?.called?.reordered}/${c.lift?.called?.enrolled} vs ${c.lift?.control?.reordered}/${c.lift?.control?.enrolled}`
    : ""
);

r = await call(tool("list_customers", { cohort: "running_low", limit: 5 }), { headers: auth });
c = content(r);
check("list_customers running_low", r.status === 200 && Array.isArray(c) && c.length > 0, c ? `${c.length} rows` : "");

r = await call(tool("customer_detail", { nameOrPhone: "9487403277" }), { headers: auth });
c = content(r);
check(
  "customer_detail Chiranjeevi",
  r.status === 200 && c?.found && c.customer?.cohort === "Running low",
  c?.customer ? `${c.customer.name} · ${c.customer.cohort} · ${c.customer.group} · last ${c.customer.lastOrderAt}` : ""
);

r = await call(tool("recent_calls", { limit: 3 }), { headers: auth });
c = content(r);
check("recent_calls", r.status === 200 && Array.isArray(c), c ? `${c.length} calls` : "");

r = await call(tool("call_transcript", { customerName: "Dakshin" }), { headers: auth });
c = content(r);
check(
  "call_transcript Dakshin",
  r.status === 200 && typeof c?.found === "boolean",
  c?.found ? `${c.seconds}s, ${(c.transcript ?? "").length} chars` : "no call on record"
);

r = await call(tool("follow_ups", { status: "all", limit: 5 }), { headers: auth });
c = content(r);
check("follow_ups", r.status === 200 && Array.isArray(c), c ? `${c.length} rows` : "");

r = await call(tool("voice_of_customer"), { headers: auth });
c = content(r);
check("voice_of_customer", r.status === 200 && c?.distributions, c ? `${c.conversations} conversations` : "");

r = await call(tool("cohort_retention"), { headers: auth });
c = content(r);
check(
  "cohort_retention",
  r.status === 200 && c?.cohorts?.length > 0,
  c ? `${c.cohorts.length} cohorts · cycle ${c.reorderCycleDays} d · ${c.insights.length} insights` : ""
);

r = await call(tool("segments", { segment: "at_risk" }), { headers: auth });
c = content(r);
check(
  "segments at_risk",
  r.status === 200 && c?.segment?.segment === "at_risk",
  c ? `${c.members?.length} members · ${c.segment?.callableNow} callable` : ""
);

r = await call(tool("replenishment_windows"), { headers: auth });
c = content(r);
check(
  "replenishment_windows",
  r.status === 200 && Array.isArray(c?.products),
  c
    ? c.products.map((p) => `${p.product} ${p.daysPerOrderInForce}d${p.learnedWindowApplied ? "*" : ""}`).join(", ")
    : ""
);

r = await call(tool("weekly_brief"), { headers: auth });
c = content(r);
check("weekly_brief", r.status === 200 && c?.week?.length === 7, c ? `${c.week.length} rows` : "");

r = await call(tool("list_customers", { limit: 0 }), { headers: auth });
check("bad arguments → isError", r.status === 200 && r.body?.result?.isError === true);

r = await call(tool("nope"), { headers: auth });
check("unknown tool → -32602", r.status === 200 && r.body?.error?.code === -32602);

r = await call(rpc("resources/read", { uri: "x" }), { headers: auth });
check("unknown method → -32601", r.status === 200 && r.body?.error?.code === -32601);

r = await call([rpc("ping"), rpc("ping")], { headers: auth });
check("batch of two pings", r.status === 200 && Array.isArray(r.body) && r.body.length === 2);

r = await call(rpc("ping"), { target: `${url}?token=${encodeURIComponent(token)}` });
check("token in query string", r.status === 200 && r.body?.id === id);

r = await call(null, { headers: auth, method: "GET" });
check("GET → 405", r.status === 405);

r = await call(null, { headers: auth, method: "DELETE" });
check("DELETE → 204", r.status === 204);

for (const x of results) console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.name}${x.note ? "  · " + x.note : ""}`);
const passed = results.filter((x) => x.ok).length;
console.log(`\n${passed}/${results.length} passed against ${url}`);
process.exit(passed === results.length ? 0 : 1);
