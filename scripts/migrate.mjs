// Applies drizzle/*.sql in order. Idempotent (statements use IF NOT EXISTS).
// Run: pnpm db:migrate   (loads .env.local via node --env-file)
// Works with pglite://<dir>, Neon, or any Postgres URL.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing in .env.local (try pglite://.data/dobara)");
  process.exit(1);
}

const dir = path.resolve("drizzle");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const statements = [];
for (const file of files) statements.push([file, await readFile(path.join(dir, file), "utf8")]);

if (url.startsWith("pglite://")) {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = url.slice("pglite://".length) || ".data/dobara";
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.dirname(path.resolve(dataDir)), { recursive: true });
  const db = new PGlite(dataDir);
  for (const [file, sql] of statements) {
    await db.exec(sql);
    console.log(`applied ${file} (pglite ${dataDir})`);
  }
  await db.close();
} else {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: url,
    ssl: /neon\.tech|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    for (const [file, sql] of statements) {
      await client.query(sql);
      console.log(`applied ${file}`);
    }
  } finally {
    await client.end();
  }
}
console.log("Migration complete.");
