import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";

const HMAC_SECRET = process.env.TOKEN_HMAC_SECRET ?? "";
const ENC_KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");

/* ---- Passwords ---- */
export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/* ---- Single-use tokens (invite / password reset): store only the digest ---- */
export function newToken(): { raw: string; digest: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, digest: sha256(raw) };
}
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/* ---- HMAC-signed tokens (unsubscribe / transfer-status): no DB lookup to verify authenticity ---- */
export function signToken(payload: string): string {
  const sig = createHmac("sha256", HMAC_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}
export function verifyToken(token: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const payload = Buffer.from(body, "base64url").toString();
  const expected = createHmac("sha256", HMAC_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}

/* ---- Field-level encryption (AES-256-GCM) for pastoral notes, prayer content, board minutes ---- */
export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}
export function decryptField(payload: string): string {
  const [iv, tag, data] = payload.split(":");
  if (!iv || !tag || !data) throw new Error("bad ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
