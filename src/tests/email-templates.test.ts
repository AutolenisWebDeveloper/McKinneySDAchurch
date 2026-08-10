import { describe, it, expect } from "vitest";
import {
  pendingReviewEmail, decisionEmail,
  accountRequestReceivedEmail, accountApprovedEmail, accountNeedsInfoEmail, accountRejectedEmail,
} from "@/lib/email-templates";

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

describe("account-request email templates (Phase 2)", () => {
  it("received/approved/needs-info/rejected render the right intent", () => {
    expect(accountRequestReceivedEmail({ firstName: "Jane", churchName: "MSDA" }).subject).toContain("received");
    expect(accountApprovedEmail({ firstName: "Jane", churchName: "MSDA", loginUrl: "https://x/auth/login", auto: true }).html).toContain("https://x/auth/login");
    expect(accountNeedsInfoEmail({ firstName: "Jane", churchName: "MSDA", note: "need DOB", contactEmail: "info@x.org" }).html).toContain("need DOB");
    expect(accountRejectedEmail({ firstName: "Jane", churchName: "MSDA", reason: "no record", contactEmail: "info@x.org" }).html).toContain("no record");
  });
  it("escapes applicant-supplied text (needs-info note, reject reason)", () => {
    const n = accountNeedsInfoEmail({ firstName: "Jane", churchName: "MSDA", note: "<b>x</b>", contactEmail: "info@x.org" });
    expect(n.html).not.toContain("<b>x</b>");
    expect(n.html).toContain("&lt;b&gt;");
    const r = accountRejectedEmail({ firstName: "<i>J</i>", churchName: "MSDA", contactEmail: "info@x.org" });
    expect(r.html).not.toContain("<i>J</i>");
  });
});
