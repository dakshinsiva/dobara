// Seeds a deployed workspace for a live demo: signs in, adds the people who will
// receive test calls, connects the built-in sample store and runs the first sync.
//
// Usage:
//   DEMO_PASSWORD=... node scripts/seed-demo.mjs --url https://dobara.vercel.app \
//     --contacts "Dakshin,9108706622,en;Chiranjeevi,9487403277,en"
//
// Contacts are name,phone,language triples separated by semicolons. They are put in the
// called group of the running-low cohort with the brand's hero product so the agent has
// something concrete to talk about. Nothing here is written to the repository.

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : null))
    .filter(Boolean)
);
const base = (args.url ?? "").replace(/\/$/, "");
const password = process.env.DEMO_PASSWORD ?? "";
if (!base) {
  console.error("--url is required");
  process.exit(1);
}

let cookie = "";
async function call(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(init.headers ?? {}) },
    redirect: "manual",
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

// 1. Sign in (no-op when the deployment has no password)
if (password) {
  const form = new URLSearchParams({ password, back: "/" });
  const res = await fetch(`${base}/api/login`, { method: "POST", body: form, redirect: "manual" });
  const set = res.headers.get("set-cookie") ?? "";
  const m = set.match(/dobara_session=([^;]+)/);
  if (!m) {
    console.error(`Sign-in failed (${res.status}). Check DEMO_PASSWORD.`);
    process.exit(1);
  }
  cookie = `dobara_session=${m[1]}`;
  console.log("signed in");
}

// 2. Contacts
const rows = (args.contacts ?? "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [name, phone, language = "en"] = s.split(",").map((x) => x.trim());
    return {
      name,
      phone,
      language,
      cohort: "running_low",
      group: "called",
      product: "No-Nonsense Plant Protein",
      flavour: "Indonesian Cacao",
      last_order_at: new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10),
    };
  });
if (rows.length) {
  const r = await call("/api/contacts", { method: "POST", body: JSON.stringify({ rows, calledShare: 1 }) });
  console.log("contacts:", r.status, JSON.stringify(r.body));
}

// 3. Sample store
const r1 = await call("/api/integrations/shopify", {
  method: "POST",
  body: JSON.stringify({
    shop: `${base}/api/sample-store`,
    token: "sample",
    settings: { daysPerOrder: 30, calledShare: 0.7 },
  }),
});
console.log("store:", r1.status, JSON.stringify(r1.body));
const r2 = await call("/api/integrations/shopify/sync", { method: "POST" });
console.log("sync:", r2.status, JSON.stringify(r2.body?.summary ?? r2.body));
