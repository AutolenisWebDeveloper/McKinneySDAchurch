import { describe, it, expect } from "vitest";
import { pendingReviewEmail, decisionEmail } from "@/lib/email-templates";

describe("approval email templates", () => {
  it("pending email includes title, ministry, and review link", () => {
    const r = pendingReviewEmail({ kind: "announcement", title: "Potluck", ministryName: "Youth", reviewUrl: "https://x/dashboard/admin/approvals" });
    expect(r.subject).toContain("Potluck");
    expect(r.html).toContain("Youth");
    expect(r.html).toContain("https://x/dashboard/admin/approvals");
  });
  it("approved vs rejected differ and rejected carries the reason", () => {
    expect(decisionEmail({ kind: "event", title: "X", approved: true }).html).toContain("approved and published");
    const rej = decisionEmail({ kind: "event", title: "X", approved: false, reason: "off-topic" });
    expect(rej.html).toContain("not approved");
    expect(rej.html).toContain("off-topic");
  });
  it("escapes HTML in user-supplied title (no injection into emails)", () => {
    const r = decisionEmail({ kind: "announcement", title: "<script>alert(1)</script>", approved: true });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
});
