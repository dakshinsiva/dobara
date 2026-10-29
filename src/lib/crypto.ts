/**
 * Encryption at rest for store tokens. AES-256-GCM with a key derived from
 * INTEGRATION_SECRET (falls back to WEBHOOK_SECRET so local setups need no extra var).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.INTEGRATION_SECRET || process.env.WEBHOOK_SECRET;
  if (!secret) throw new Error("Set INTEGRATION_SECRET (or WEBHOOK_SECRET) to store integration tokens.");
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(packed: string): string {
  const [iv, tag, body] = packed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
