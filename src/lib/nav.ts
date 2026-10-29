import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Badge count for the sidebar. Never throws: an unconfigured database just shows no badge. */
export async function getOpenActionCount(): Promise<number> {
  try {
    const db = getDb();
    const [row] = await db.select({ n: count() }).from(schema.actions).where(eq(schema.actions.status, "open"));
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
