import { describe, it, expect } from "vitest";
import { canBaptismTransition } from "@/lib/baptism";

describe("baptism pipeline", () => {
  it("advances through the stages in order", () => {
    expect(canBaptismTransition("REQUESTED", "IN_CLASS")).toBe(true);
    expect(canBaptismTransition("IN_CLASS", "SCHEDULED")).toBe(true);
    expect(canBaptismTransition("SCHEDULED", "COMPLETED")).toBe(true);
  });
  it("allows withdrawing from any active stage", () => {
    expect(canBaptismTransition("REQUESTED", "WITHDRAWN")).toBe(true);
    expect(canBaptismTransition("SCHEDULED", "WITHDRAWN")).toBe(true);
  });
  it("rejects skips and terminal transitions", () => {
    expect(canBaptismTransition("REQUESTED", "COMPLETED")).toBe(false);
    expect(canBaptismTransition("COMPLETED", "SCHEDULED")).toBe(false);
    expect(canBaptismTransition("WITHDRAWN", "REQUESTED")).toBe(false);
  });
});
