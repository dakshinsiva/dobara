/** Formatting helpers. All dates render in India time; money comes from Bolna in USD cents. */

const IST = "Asia/Kolkata";

/** Approximate conversion for display only; override with INR_PER_USD. */
export function inrPerUsd(): number {
  const n = Number(process.env.INR_PER_USD);
  return Number.isFinite(n) && n > 0 ? n : 84;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" });
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

/** Bolna reports total_cost in USD cents. */
export function fmtUsdCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function fmtInrFromCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const inr = (cents / 100) * inrPerUsd();
  return `₹${inr.toFixed(inr < 10 ? 1 : 0)}`;
}

export function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en-IN", { notation: n >= 10_000 ? "compact" : "standard" }).format(n);
}

/** +919108706622 → +91 91087 06622 */
export function fmtPhone(phone: string): string {
  const m = phone.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}
