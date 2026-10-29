import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzlePg<typeof schema>>;

/**
 * DATABASE_URL decides the driver:
 *   pglite://.data/dobara        embedded Postgres on disk, zero setup (local dev, demos)
 *   postgres://...neon.tech/...  Neon over HTTP (Vercel production)
 *   postgres://localhost/...     any other Postgres over TCP
 */
function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Use pglite://.data/dobara for local dev, or provision Neon with `vercel integration add neon`."
    );
  }
  if (url.startsWith("pglite://")) {
    const dir = url.slice("pglite://".length) || ".data/dobara";
    mkdirSync(path.dirname(path.resolve(dir)), { recursive: true });
    // One PGlite instance per process; survives Next.js dev reloads.
    const g = globalThis as unknown as { __pglite?: PGlite; __pgliteShutdown?: boolean };
    g.__pglite ??= new PGlite(dir);
    if (!g.__pgliteShutdown) {
      // Checkpoint on shutdown: a killed process leaves the WAL without a valid checkpoint
      // and PGlite then refuses to open the directory.
      g.__pgliteShutdown = true;
      const close = () => {
        g.__pglite?.close().finally(() => process.exit(0));
      };
      process.once("SIGTERM", close);
      process.once("SIGINT", close);
    }
    return drizzlePglite(g.__pglite, { schema }) as unknown as Db;
  }
  if (/neon\.tech/.test(url)) {
    return drizzleNeon(neon(url), { schema }) as unknown as Db;
  }
  return drizzlePg(new Pool({ connectionString: url }), { schema });
}

const g = globalThis as unknown as { __dobaraDb?: Db };

/** Lazy so `next build` does not need DATABASE_URL. */
export function getDb(): Db {
  g.__dobaraDb ??= createDb();
  return g.__dobaraDb;
}

export { schema };
