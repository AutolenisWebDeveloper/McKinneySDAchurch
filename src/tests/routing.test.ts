import { describe, it, expect } from "vitest";
import { routeWorkItem } from "@/lib/routing";

describe("routeWorkItem", () => {
  it("routes care and prayer to pastor + elders", () => {
    expect(routeWorkItem("CARE").roles.sort()).toEqual(["ELDER", "PASTOR"]);
    expect(routeWorkItem("PRAYER").roles.sort()).toEqual(["ELDER", "PASTOR"]);
  });
  it("routes support/contact/sponsor to admin", () => {
    expect(routeWorkItem("SUPPORT").roles).toEqual(["ADMIN"]);
    expect(routeWorkItem("CONTACT").roles).toEqual(["ADMIN"]);
    expect(routeWorkItem("SPONSOR").roles).toEqual(["ADMIN"]);
  });
  it("routes leadership messages to pastor, elders and admin", () => {
    expect(routeWorkItem("LEADERSHIP_MESSAGE").roles.sort()).toEqual(["ADMIN", "ELDER", "PASTOR"]);
  });
  it("adds the ministry head and enables ministry scope for a ministry-linked volunteer app", () => {
    const generic = routeWorkItem("VOLUNTEER");
    expect(generic.roles).toEqual(["ADMIN"]);
    expect(generic.ministryScoped).toBe(true);

    const scoped = routeWorkItem("VOLUNTEER", { ministryId: "min1" });
    expect(scoped.roles.sort()).toEqual(["ADMIN", "MINISTRY_HEAD"]);
    expect(scoped.ministryScoped).toBe(true);
  });
  it("urgent care always includes the pastor (idempotent)", () => {
    const r = routeWorkItem("CARE", { priority: "URGENT" });
    expect(r.roles).toContain("PASTOR");
    expect(r.roles.filter((x) => x === "PASTOR")).toHaveLength(1);
  });
});
