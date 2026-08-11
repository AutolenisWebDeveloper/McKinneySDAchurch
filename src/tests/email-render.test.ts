import { describe, it, expect } from "vitest";
import { renderTemplate, extractVariables, escapeHtml, stripHtml } from "@/lib/email-render";

describe("email template rendering (safe substitution)", () => {
  it("substitutes {{variables}} in subject and body", () => {
    const r = renderTemplate(
      { subject: "Hi {{firstName}}", htmlBody: "<p>Welcome to {{church}}, {{firstName}}.</p>" },
      { firstName: "Jane", church: "MSDA" },
    );
    expect(r.subject).toBe("Hi Jane");
    expect(r.html).toContain("Welcome to MSDA, Jane.");
  });

  it("HTML-escapes variable values (no injection)", () => {
    const r = renderTemplate(
      { subject: "{{name}}", htmlBody: "<p>{{name}}</p>" },
      { name: "<script>alert(1)</script>" },
    );
    expect(r.subject).not.toContain("<script>");
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });

  it("renders missing variables as empty (never leaks {{…}})", () => {
    const r = renderTemplate({ subject: "Hi {{missing}}", htmlBody: "<p>{{missing}}</p>" }, {});
    expect(r.subject).toBe("Hi ");
    expect(r.html).toBe("<p></p>");
  });

  it("does NOT evaluate expressions — only named placeholders substitute", () => {
    const r = renderTemplate({ subject: "{{ 1+1 }}", htmlBody: "<p>{{a.b}}</p>" }, { a: "x" });
    // "1+1" and "a.b" are not valid [a-zA-Z0-9_] placeholders → left untouched
    expect(r.subject).toBe("{{ 1+1 }}");
    expect(r.html).toBe("<p>{{a.b}}</p>");
  });

  it("uses a provided plain-text body verbatim (no escaping)", () => {
    const r = renderTemplate(
      { subject: "s", htmlBody: "<p>{{x}}</p>", textBody: "Value: {{x}}" },
      { x: "a & b" },
    );
    expect(r.text).toBe("Value: a & b");
    expect(r.html).toContain("a &amp; b");
  });

  it("derives a plain-text fallback from HTML when no text body is set", () => {
    const r = renderTemplate({ subject: "s", htmlBody: "<h2>Hi</h2><p>Line one</p><p>Line two</p>" }, {});
    expect(r.text).toBe("Hi\nLine one\nLine two");
  });

  it("extractVariables lists distinct names across bodies", () => {
    expect(extractVariables("Hi {{a}}", "<p>{{b}} {{a}}</p>", "{{c}}").sort()).toEqual(["a", "b", "c"]);
  });

  it("escapeHtml/stripHtml helpers behave", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    expect(stripHtml("<p>a</p><p>b</p>")).toBe("a\nb");
    expect(stripHtml("line1<br>line2")).toBe("line1\nline2");
  });
});
