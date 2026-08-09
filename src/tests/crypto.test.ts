import { describe, it, expect } from "vitest";
import { newToken, sha256, signToken, verifyToken, encryptField, decryptField } from "@/lib/crypto";
import { generateSecret, totp, verifyTotp } from "@/lib/mfa";

describe("crypto — single-use tokens (invite/reset)", () => {
  it("stores only a digest that matches the raw token", () => {
    const { raw, digest } = newToken();
    expect(digest).toBe(sha256(raw));
    expect(digest).not.toBe(raw);
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("crypto — HMAC signed tokens (unsubscribe/status)", () => {
  it("round-trips and rejects tampering", () => {
    const t = signToken("sub:123|marketing");
    expect(verifyToken(t)).toBe("sub:123|marketing");
    expect(verifyToken(t.slice(0, -2) + "xy")).toBeNull(); // tampered signature
    expect(verifyToken("garbage")).toBeNull();
  });
});

describe("crypto — field encryption (pastoral/prayer/minutes)", () => {
  it("AES-256-GCM round-trips and is non-deterministic", () => {
    const plain = "sensitive pastoral note";
    const a = encryptField(plain), b = encryptField(plain);
    expect(a).not.toBe(b);            // random IV per encryption
    expect(decryptField(a)).toBe(plain);
    expect(decryptField(b)).toBe(plain);
  });
  it("rejects tampered ciphertext", () => {
    const [iv, tag, data] = encryptField("x").split(":");
    const flip = (b64: string) => (b64[0] === "A" ? "B" : "A") + b64.slice(1); // deterministic bit change
    expect(() => decryptField([iv, flip(tag!), data].join(":"))).toThrow(); // tampered tag
  });
});

describe("mfa — TOTP for ADMIN/PASTOR", () => {
  it("verifies its own current code and rejects a wrong one", () => {
    const secret = generateSecret();
    const now = Date.now();
    expect(verifyTotp(secret, totp(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, "000000", now)).toBe(totp(secret, now) === "000000");
  });
});
