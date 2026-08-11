import { describe, it, expect } from "vitest";
import { portalFromPath } from "@/lib/portal";

describe("portalFromPath (URL is the active-portal source of truth)", () => {
  it("maps canonical portal roots", () => {
    expect(portalFromPath("/dashboard/member")).toBe("member");
    expect(portalFromPath("/dashboard/ministry")).toBe("ministry");
    expect(portalFromPath("/dashboard/leadership")).toBe("leadership");
    expect(portalFromPath("/dashboard/clerk")).toBe("clerk");
    expect(portalFromPath("/dashboard/treasurer")).toBe("treasurer");
    expect(portalFromPath("/dashboard/admin")).toBe("admin");
  });

  it("maps deep routes to their owning portal", () => {
    expect(portalFromPath("/dashboard/admin/approvals")).toBe("admin");
    expect(portalFromPath("/dashboard/ministry/announcements/new")).toBe("ministry");
    expect(portalFromPath("/dashboard/clerk/transfers")).toBe("clerk");
    expect(portalFromPath("/dashboard/leadership/workitems/abc123")).toBe("leadership");
  });

  it("maps legacy member-area routes to the member portal", () => {
    expect(portalFromPath("/dashboard/directory")).toBe("member");
    expect(portalFromPath("/dashboard/household")).toBe("member");
    expect(portalFromPath("/dashboard/profile")).toBe("member");
    expect(portalFromPath("/dashboard/fundraisers")).toBe("member");
  });

  it("returns null for the bare dashboard index and unknown segments", () => {
    expect(portalFromPath("/dashboard")).toBeNull();
    expect(portalFromPath("/dashboard/")).toBeNull();
    expect(portalFromPath("/dashboard/nonsense")).toBeNull();
  });
});
