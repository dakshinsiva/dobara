/** Read an env var at call time (not import time) so builds never need secrets. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}. See .env.example.`);
  return v;
}

export function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/** Default country code for numbers imported without a +prefix. */
export const DEFAULT_COUNTRY_CODE = () => optionalEnv("DEFAULT_COUNTRY_CODE", "+91");

/** Normalise an Indian/any number to E.164. Returns null if it cannot. */
export function toE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) {
    return /^\+[1-9]\d{6,14}$/.test(digits) ? digits : null;
  }
  const cc = DEFAULT_COUNTRY_CODE();
  // Strip a leading 0 or the bare country code (e.g. 91xxxxxxxxxx)
  let local = digits.replace(/^0+/, "");
  if (cc === "+91" && local.length === 12 && local.startsWith("91")) local = local.slice(2);
  const e164 = `${cc}${local}`;
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : null;
}
