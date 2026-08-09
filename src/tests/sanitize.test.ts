import { describe, it, expect } from "vitest";
import { sanitize } from "@/lib/sanitize";

describe("sanitize — XSS control for stored church content", () => {
  it("removes <script> tags", () => {
    expect(sanitize('<p>ok</p><script>alert(1)</script>')).toBe("<p>ok</p>");
  });
  it("strips event-handler attributes", () => {
    expect(sanitize('<p onclick="steal()">hi</p>')).toBe("<p>hi</p>");
  });
  it("drops javascript: and other unsafe URL schemes on links", () => {
    const out = sanitize('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });
  it("keeps allowed tags and forces rel on links", () => {
    const out = sanitize('<p><strong>Sabbath</strong> <a href="https://adventist.org">source</a></p>');
    expect(out).toContain("<strong>Sabbath</strong>");
    expect(out).toContain('href="https://adventist.org"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
  it("drops disallowed tags like <img> (blocks onerror payloads)", () => {
    expect(sanitize('<img src=x onerror="alert(1)">')).toBe("");
  });
});
