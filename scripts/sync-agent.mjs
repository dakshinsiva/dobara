// Creates or updates the Dobara agent on Bolna and attaches its extractions.
// Run: pnpm agent:sync   (loads .env.local via node --env-file)

import { buildAgentConfig } from "../bolna/agent.config.mjs";
import { CATEGORY, DISPOSITIONS } from "../bolna/dispositions.mjs";

const BASE = "https://api.bolna.ai";
const key = process.env.BOLNA_API_KEY;
if (!key) {
  console.error("BOLNA_API_KEY is missing in .env.local");
  process.exit(1);
}

const publicBase = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
const secret = process.env.WEBHOOK_SECRET ?? "";
const webhookUrl = publicBase
  ? `${publicBase}/api/webhooks/bolna${secret ? `?token=${encodeURIComponent(secret)}` : ""}`
  : undefined;

if (!webhookUrl) {
  console.warn(
    "PUBLIC_BASE_URL not set: agent will be created without a webhook (use the Refresh button or set it later)."
  );
}

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${path} -> ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`
    );
  }
  return json;
}

const payload = buildAgentConfig({
  webhookUrl,
  keywords: process.env.STT_KEYWORDS,
});

let agentId = process.env.BOLNA_AGENT_ID;

if (agentId) {
  await api(`/v2/agent/${agentId}`, { method: "PUT", body: payload });
  console.log(`Updated agent ${agentId}`);
} else {
  const created = await api("/v2/agent", { method: "POST", body: payload });
  agentId = created.agent_id;
  console.log(`Created agent ${agentId}`);
  console.log(`\nAdd this to .env.local:\nBOLNA_AGENT_ID=${agentId}\n`);
}

// Extraction category + dispositions (idempotent: skip if the category already has dispositions)
// The list endpoint returns { categories: [ { id, name, model, dispositions: [...] } ] }
const listed = await api(`/agent/${agentId}/extraction-categories`);
const categories = Array.isArray(listed) ? listed : (listed?.categories ?? []);
let category = categories.find((c) => c.name === CATEGORY.name);

if (!category) {
  category = await api(`/agent/${agentId}/extraction-categories`, { method: "POST", body: CATEGORY });
  console.log(`Created extraction category "${CATEGORY.name}" (${category.id})`);
} else {
  console.log(`Extraction category "${CATEGORY.name}" exists (${category.id})`);
}

// Upsert dispositions by name: update the ones that exist, bulk-create the rest.
const existing = Array.isArray(category.dispositions) ? category.dispositions : [];
const byName = new Map(existing.map((d) => [d.name, d]));
const toCreate = [];
let updated = 0;

for (const d of DISPOSITIONS) {
  const current = byName.get(d.name);
  if (!current) {
    toCreate.push({ ...d, category_id: category.id });
    continue;
  }
  const same =
    current.question === d.question &&
    Boolean(current.is_objective) === Boolean(d.is_objective) &&
    Boolean(current.is_subjective) === Boolean(d.is_subjective) &&
    JSON.stringify(current.objective_options?.map((o) => ({ value: o.value, condition: o.condition })) ?? []) ===
      JSON.stringify(d.objective_options?.map((o) => ({ value: o.value, condition: o.condition })) ?? []);
  if (same) continue;
  await api(`/dispositions/${current.id}`, {
    method: "PUT",
    body: {
      question: d.question,
      is_objective: Boolean(d.is_objective),
      is_subjective: Boolean(d.is_subjective),
      ...(d.subjective_type ? { subjective_type: d.subjective_type } : {}),
      ...(d.objective_options ? { objective_options: d.objective_options } : {}),
    },
  });
  updated += 1;
  console.log(`Updated disposition "${d.name}"`);
}

if (toCreate.length) {
  const res = await api("/dispositions/bulk", {
    method: "POST",
    body: { agent_id: agentId, dispositions: toCreate },
  });
  console.log(`Created ${res.ids?.length ?? toCreate.length} dispositions`);
}
const stale = existing.filter((d) => !DISPOSITIONS.some((x) => x.name === d.name)).map((d) => d.name);
if (stale.length) console.log(`Dispositions on Bolna not in dispositions.mjs (left untouched): ${stale.join(", ")}`);
console.log(`Dispositions: ${DISPOSITIONS.length} defined, ${updated} updated, ${toCreate.length} created`);

console.log(`\nWebhook: ${webhookUrl ?? "(none)"}`);
console.log("Done.");
