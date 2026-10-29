// Verifies the Bolna API key and prints wallet balance and concurrency.
// Run: pnpm bolna:me

const key = process.env.BOLNA_API_KEY;
if (!key) {
  console.error("BOLNA_API_KEY is missing in .env.local");
  process.exit(1);
}
const res = await fetch("https://api.bolna.ai/user/me", {
  headers: { Authorization: `Bearer ${key}` },
});
if (!res.ok) {
  console.error(`Bolna returned ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const me = await res.json();
// Never print secrets; this endpoint returns account metadata only.
console.log(JSON.stringify(me, null, 2));
