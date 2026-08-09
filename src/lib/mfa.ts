import { createHmac, randomBytes } from "node:crypto";

/** MFA for ADMIN/PASTOR (RFC 6238 TOTP). Secret stored encrypted at rest (see crypto.encryptField). */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(bytes = 20): string {
  const b = randomBytes(bytes);
  let bits = "", out = "";
  for (const x of b) bits += x.toString(2).padStart(8, "0");
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function b32decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const c of clean) {
    const v = B32.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totp(secret: string, atMs: number = Date.now(), step = 30, digits = 6): string {
  const counter = Math.floor(atMs / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const h = createHmac("sha1", b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1]! & 0xf;
  const code = ((h[o]! & 0x7f) << 24) | ((h[o + 1]! & 0xff) << 16) | ((h[o + 2]! & 0xff) << 8) | (h[o + 3]! & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, "0");
}

/** Accept the current +/- `window` steps to tolerate clock drift. */
export function verifyTotp(secret: string, token: string, atMs: number = Date.now(), window = 1): boolean {
  for (let w = -window; w <= window; w++) {
    if (totp(secret, atMs + w * 30_000) === token) return true;
  }
  return false;
}
