import { describe, it, expect } from "vitest";
import { isInviteEligible, memberDraftFromVisitor } from "@/lib/visitors";
import { welcomeVisitorEmail, weeklyInviteEmail } from "@/lib/email-templates";

describe("visitor lifecycle helpers", () => {
  it("invite eligibility requires ACTIVE + opted-in", () => {
    expect(isInviteEligible({ status: "ACTIVE", marketingOptIn: true })).toBe(true);
    expect(isInviteEligible({ status: "ACTIVE", marketingOptIn: false })).toBe(false);
    expect(isInviteEligible({ status: "INACTIVE", marketingOptIn: true })).toBe(false);
  });
  it("splits a visitor name into a member draft", () => {
    expect(memberDraftFromVisitor({ name: "Ada Grace Lovelace", email: "a@b.com" }))
      .toMatchObject({ firstName: "Ada", lastName: "Grace Lovelace", email: "a@b.com" });
    expect(memberDraftFromVisitor({ name: "Cher" })).toMatchObject({ firstName: "Cher", lastName: "" });
  });
  it("invite template carries a visible unsubscribe link", () => {
    const r = weeklyInviteEmail({ name: "Ada", planVisitUrl: "https://x/plan-a-visit", unsubscribeUrl: "https://x/api/email/unsubscribe/T" });
    expect(r.html).toContain("unsubscribe");
    expect(r.html).toContain("https://x/api/email/unsubscribe/T");
    expect(welcomeVisitorEmail({ name: "Ada" }).subject).toContain("Welcome");
  });
});
