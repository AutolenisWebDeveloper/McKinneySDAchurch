import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { normalizeEmail } from "@/lib/email-identity";
import { shouldSuppress } from "@/lib/suppression";
import { unsubscribeToken, parseUnsubscribeToken, listUnsubscribeHeaders } from "@/lib/unsubscribe";
import { verifyResendSignature, mapResendEvent } from "@/lib/webhooks";

describe("email identity", () => {
  it("normalizes case + whitespace", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
  });
});

describe("suppression decision", () => {
  it("transactional bypasses marketing suppression but honors GLOBAL", () => {
    expect(shouldSuppress({ scopes: ["MARKETING"], type: "TRANSACTIONAL" })).toBe(false);
    expect(shouldSuppress({ scopes: ["GLOBAL"], type: "TRANSACTIONAL" })).toBe(true);
  });
  it("marketing is suppressed by GLOBAL, MARKETING, or unsubscribed", () => {
    expect(shouldSuppress({ scopes: [], type: "MARKETING", subscribed: true })).toBe(false);
    expect(shouldSuppress({ scopes: ["MARKETING"], type: "MARKETING", subscribed: true })).toBe(true);
    expect(shouldSuppress({ scopes: [], type: "MARKETING", subscribed: false })).toBe(true);
    expect(shouldSuppress({ scopes: ["GLOBAL"], type: "MARKETING", subscribed: true })).toBe(true);
  });
});

describe("unsubscribe token (RFC 8058)", () => {
  it("round-trips and rejects tampering", () => {
    const t = unsubscribeToken("A@B.com", "NEWSLETTER");
    expect(parseUnsubscribeToken(t)).toEqual({ email: "a@b.com", listType: "NEWSLETTER" });
    expect(parseUnsubscribeToken(t.slice(0, -2) + "zz")).toBeNull();
  });
  it("builds one-click headers", () => {
    const h = listUnsubscribeHeaders("https://mckinneysda.org", "TOK");
    expect(h["List-Unsubscribe"]).toContain("/api/email/unsubscribe/TOK");
    expect(h["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});

describe("Resend webhook", () => {
  const secret = "whsec_" + Buffer.from("supersecretkeymaterial").toString("base64");
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "e1", to: ["x@y.com"] } });
  const id = "msg_1", timestamp = "1700000000";
  const sig = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${timestamp}.${body}`).digest("base64");

  it("accepts a valid signature and rejects a tampered body", () => {
    expect(verifyResendSignature(body, { id, timestamp, signature: `v1,${sig}` }, secret)).toBe(true);
    expect(verifyResendSignature(body + "x", { id, timestamp, signature: `v1,${sig}` }, secret)).toBe(false);
  });
  it("maps events to status + hard suppression", () => {
    expect(mapResendEvent("email.delivered")).toEqual({ status: "DELIVERED" });
    expect(mapResendEvent("email.bounced")).toEqual({ status: "BOUNCED", suppress: "GLOBAL" });
    expect(mapResendEvent("email.complained")).toEqual({ status: "COMPLAINED", suppress: "GLOBAL" });
    expect(mapResendEvent("email.opened")).toBeNull();
  });
});
