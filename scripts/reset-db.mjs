// Drops all rows (not the schema) so a demo starts from a clean slate.
// Run: pnpm db:reset   (stop `pnpm dev` first when using PGlite)

import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing in .env.local");
  process.exit(1);
}

const sql = "TRUNCATE actions, calls, contacts, integrations RESTART IDENTITY CASCADE";

if (url.startsWith("pglite://")) {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = url.slice("pglite://".length) || ".data/dobara";
  const db = new PGlite(path.resolve(dataDir));
  await db.exec(sql);
  await db.close();
} else {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: url,
    ssl: /neon\.tech|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}
console.log("All contacts, calls, actions and store connections removed.");
