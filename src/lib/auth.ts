/**
 * Single shared password for the console. Set DEMO_PASSWORD to turn it on;
 * leave it unset for local development. The cookie holds a hash, never the password.
 */
export const SESSION_COOKIE = "dobara_session";

export function authEnabled(): boolean {
  return Boolean(process.env.DEMO_PASSWORD);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The value a logged-in browser carries. Derived from the password and a server secret. */
export async function sessionToken(): Promise<string> {
  const secret = process.env.INTEGRATION_SECRET || process.env.WEBHOOK_SECRET || "";
  return sha256Hex(`dobara|${process.env.DEMO_PASSWORD}|${secret}`);
}

export async function passwordMatches(candidate: string): Promise<boolean> {
  if (!authEnabled()) return true;
  const [a, b] = await Promise.all([sha256Hex(candidate), sha256Hex(process.env.DEMO_PASSWORD ?? "")]);
  return a === b;
}

/** Paths that must stay reachable without a session: machine-to-machine routes and the login itself. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/sample-store/")
  );
}
