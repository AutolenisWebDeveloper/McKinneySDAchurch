import { describe, it, expect } from "vitest";
import type { FundraiserStatus } from "@prisma/client";
import {
  transition,
  availableActions,
  decideEdit,
  validateGoal,
  goalFloor,
  eligibleTypes,
  canCreateType,
  pickPrimary,
  milestonesReached,
  nextMilestone,
  newlyCrossedMilestones,
  isPubliclyVisible,
  isEditable,
  GOAL_MIN,
  GOAL_MAX,
  type PrimaryCandidate,
} from "@/lib/fundraiser-workflow";

const ALL_STATUSES: FundraiserStatus[] = [
  "DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "REJECTED", "ACTIVE", "CLOSED", "ARCHIVED",
];

describe("fundraiser status transitions (§7)", () => {
  it("walks the happy path draft → pending → active", () => {
    const submitted = transition("DRAFT", "submit", "owner");
    expect(submitted).toEqual({ ok: true, status: "PENDING_REVIEW" });
    expect(transition("PENDING_REVIEW", "approve", "admin")).toEqual({ ok: true, status: "ACTIVE" });
  });

  it("returns changes-requested to review after a resubmit", () => {
    expect(transition("PENDING_REVIEW", "request_changes", "admin", { note: "Please shorten the title" }))
      .toEqual({ ok: true, status: "CHANGES_REQUESTED" });
    expect(transition("CHANGES_REQUESTED", "submit", "owner")).toEqual({ ok: true, status: "PENDING_REVIEW" });
  });

  it("lets an admin reopen a rejected fundraiser", () => {
    expect(transition("PENDING_REVIEW", "reject", "admin", { note: "Duplicate" })).toEqual({ ok: true, status: "REJECTED" });
    expect(transition("REJECTED", "reopen", "admin")).toEqual({ ok: true, status: "PENDING_REVIEW" });
  });

  it("closes then archives", () => {
    expect(transition("ACTIVE", "close", "owner")).toEqual({ ok: true, status: "CLOSED" });
    expect(transition("CLOSED", "archive", "admin")).toEqual({ ok: true, status: "ARCHIVED" });
  });

  it("never lets an owner approve, reject, or archive their own fundraiser", () => {
    for (const action of ["approve", "reject", "request_changes", "reopen", "archive"] as const) {
      for (const from of ALL_STATUSES) {
        expect(transition(from, action, "owner").ok, `${action} from ${from}`).toBe(false);
      }
    }
  });

  it("requires a note before returning or declining", () => {
    expect(transition("PENDING_REVIEW", "request_changes", "admin")).toMatchObject({ ok: false });
    expect(transition("PENDING_REVIEW", "request_changes", "admin", { note: "   " })).toMatchObject({ ok: false });
    expect(transition("PENDING_REVIEW", "reject", "admin", { note: "" })).toMatchObject({ ok: false });
  });

  it("rejects every transition out of a terminal status", () => {
    for (const action of ["submit", "approve", "request_changes", "reject", "reopen", "close"] as const) {
      expect(transition("ARCHIVED", action, "admin", { note: "n" }).ok, action).toBe(false);
    }
  });

  it("cannot skip review — draft never jumps straight to active", () => {
    expect(transition("DRAFT", "approve", "admin").ok).toBe(false);
    expect(transition("CHANGES_REQUESTED", "approve", "admin").ok).toBe(false);
    expect(transition("REJECTED", "approve", "admin").ok).toBe(false);
  });

  it("cannot archive something that was never closed", () => {
    expect(transition("ACTIVE", "archive", "admin").ok).toBe(false);
    expect(transition("REJECTED", "archive", "admin").ok).toBe(false);
  });

  it("lists only actions that actually succeed", () => {
    for (const from of ALL_STATUSES) {
      for (const actor of ["owner", "admin"] as const) {
        for (const action of availableActions(from, actor)) {
          expect(transition(from, action, actor, { note: "note" }).ok, `${actor}:${action}@${from}`).toBe(true);
        }
      }
    }
  });

  it("exposes only ACTIVE fundraisers publicly", () => {
    for (const s of ALL_STATUSES) expect(isPubliclyVisible(s)).toBe(s === "ACTIVE");
  });

  it("freezes closed and archived fundraisers", () => {
    expect(isEditable("CLOSED")).toBe(false);
    expect(isEditable("ARCHIVED")).toBe(false);
    expect(isEditable("ACTIVE")).toBe(true);
  });
});

describe("edit rules (§8)", () => {
  const base = { status: "ACTIVE" as FundraiserStatus, title: "Team Ada", type: "PERSONAL" as const, verifiedRaised: 2500, minGoal: GOAL_MIN, maxGoal: GOAL_MAX };

  it("keeps an active fundraiser live for content edits", () => {
    const d = decideEdit(base, { story: "New story", graphicUrl: "https://x/y.png", targetDate: new Date(), personalGoal: 12000 });
    expect(d).toEqual({ ok: true, requiresReapproval: false, nextStatus: "ACTIVE" });
  });

  it("sends a live title change back to review", () => {
    expect(decideEdit(base, { title: "A different name" })).toEqual({ ok: true, requiresReapproval: true, nextStatus: "PENDING_REVIEW" });
  });

  it("sends a live type change back to review", () => {
    expect(decideEdit(base, { type: "FAMILY" })).toEqual({ ok: true, requiresReapproval: true, nextStatus: "PENDING_REVIEW" });
  });

  it("does not re-review a title that did not actually change", () => {
    expect(decideEdit(base, { title: "Team Ada" })).toMatchObject({ requiresReapproval: false });
  });

  it("does not bounce a draft into review for an identity edit", () => {
    const d = decideEdit({ ...base, status: "DRAFT" }, { title: "Renamed" });
    expect(d).toEqual({ ok: true, requiresReapproval: false, nextStatus: "DRAFT" });
  });

  it("refuses any edit once closed or archived", () => {
    expect(decideEdit({ ...base, status: "CLOSED" }, { story: "x" }).ok).toBe(false);
    expect(decideEdit({ ...base, status: "ARCHIVED" }, { story: "x" }).ok).toBe(false);
  });

  it("blocks a goal below what has already been verified", () => {
    const d = decideEdit(base, { personalGoal: 2000 });
    expect(d.ok).toBe(false);
    expect(d.ok === false && d.reason).toMatch(/2,500/);
  });

  it("allows a goal exactly equal to verified raised", () => {
    expect(decideEdit(base, { personalGoal: 2500 }).ok).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(decideEdit(base, { title: "   " }).ok).toBe(false);
  });
});

describe("goal validation (§6, §8, §18)", () => {
  const ctx = { verifiedRaised: 0, minGoal: GOAL_MIN, maxGoal: GOAL_MAX };

  it("enforces the configured bounds", () => {
    expect(validateGoal(GOAL_MIN - 1, ctx).ok).toBe(false);
    expect(validateGoal(GOAL_MAX + 1, ctx).ok).toBe(false);
    expect(validateGoal(GOAL_MIN, ctx).ok).toBe(true);
    expect(validateGoal(GOAL_MAX, ctx).ok).toBe(true);
  });

  it("rejects non-integer dollars", () => {
    expect(validateGoal(1000.5, ctx).ok).toBe(false);
    expect(validateGoal(Number.NaN, ctx).ok).toBe(false);
  });

  it("floors at whichever is higher — the configured minimum or the verified raised", () => {
    expect(goalFloor({ verifiedRaised: 0, minGoal: GOAL_MIN })).toBe(GOAL_MIN);
    expect(goalFloor({ verifiedRaised: 7500, minGoal: GOAL_MIN })).toBe(7500);
  });
});

describe("type eligibility (§5)", () => {
  it("gives a supporter personal only, whatever else is passed in", () => {
    const types = eligibleTypes({
      kind: "supporter", eligible: true,
      householdId: "h1", canManageHouseholdFundraising: true, ministryIds: ["m1"], isAdmin: true,
    });
    expect(types).toEqual(["PERSONAL"]);
    expect(canCreateType({ kind: "supporter", eligible: true }, "FAMILY")).toBe(false);
    expect(canCreateType({ kind: "supporter", eligible: true }, "MINISTRY")).toBe(false);
  });

  it("gives a plain member personal only", () => {
    expect(eligibleTypes({ kind: "member", eligible: true, householdId: "h1" })).toEqual(["PERSONAL"]);
  });

  it("adds family only with the household fundraising permission", () => {
    expect(eligibleTypes({ kind: "member", eligible: true, householdId: "h1", canManageHouseholdFundraising: true }))
      .toEqual(["PERSONAL", "FAMILY"]);
    // permission without a household is not enough
    expect(eligibleTypes({ kind: "member", eligible: true, canManageHouseholdFundraising: true })).toEqual(["PERSONAL"]);
  });

  it("adds ministry only for a leader with scope", () => {
    expect(eligibleTypes({ kind: "member", eligible: true, ministryIds: ["m1"] })).toEqual(["PERSONAL", "MINISTRY"]);
    expect(eligibleTypes({ kind: "member", eligible: true, ministryIds: [] })).toEqual(["PERSONAL"]);
  });

  it("gives an admin every type", () => {
    expect(eligibleTypes({ kind: "member", eligible: true, isAdmin: true })).toEqual(["PERSONAL", "FAMILY", "MINISTRY"]);
  });

  it("gives an ineligible member nothing at all", () => {
    expect(eligibleTypes({ kind: "member", eligible: false, isAdmin: true, householdId: "h", canManageHouseholdFundraising: true })).toEqual([]);
  });
});

describe("primary fundraiser selection (§11)", () => {
  const d = (s: string) => new Date(s);
  const c = (o: Partial<PrimaryCandidate> & { id: string }): PrimaryCandidate => ({
    type: "PERSONAL", status: "ACTIVE", isOwn: false, canEdit: false, pct: 0,
    lastActivityAt: d("2026-01-01"), createdAt: d("2026-01-01"), ...o,
  });

  it("returns nothing for an empty list", () => {
    expect(pickPrimary([])).toEqual({ primary: null, others: [] });
  });

  it("prefers the member's own active personal fundraiser even at a lower percentage", () => {
    const own = c({ id: "own", isOwn: true, canEdit: true, pct: 10 });
    const ministry = c({ id: "min", type: "MINISTRY", canEdit: true, pct: 90 });
    const r = pickPrimary([ministry, own]);
    expect(r.primary?.id).toBe("own");
    expect(r.others.map((o) => o.id)).toEqual(["min"]);
  });

  it("falls back to the editable fundraiser with the highest verified percent", () => {
    const a = c({ id: "a", canEdit: true, pct: 30 });
    const b = c({ id: "b", canEdit: true, pct: 80 });
    expect(pickPrimary([a, b]).primary?.id).toBe("b");
  });

  it("falls back to the most recently active when none are editable", () => {
    const older = c({ id: "older", lastActivityAt: d("2026-01-01") });
    const newer = c({ id: "newer", lastActivityAt: d("2026-06-01") });
    expect(pickPrimary([older, newer]).primary?.id).toBe("newer");
  });

  it("breaks ties on the earliest created date", () => {
    const first = c({ id: "first", canEdit: true, pct: 50, createdAt: d("2026-01-01") });
    const second = c({ id: "second", canEdit: true, pct: 50, createdAt: d("2026-05-01") });
    expect(pickPrimary([second, first]).primary?.id).toBe("first");
  });

  it("still surfaces an in-flight fundraiser when nothing is active", () => {
    const pending = c({ id: "p", status: "PENDING_REVIEW", isOwn: true });
    const closed = c({ id: "c", status: "CLOSED" });
    expect(pickPrimary([closed, pending]).primary?.id).toBe("p");
  });

  it("puts every non-primary fundraiser in others exactly once", () => {
    const list = [c({ id: "a", isOwn: true }), c({ id: "b" }), c({ id: "c" })];
    const r = pickPrimary(list);
    expect(r.others).toHaveLength(2);
    expect(new Set(r.others.map((o) => o.id)).size).toBe(2);
    expect(r.others.some((o) => o.id === r.primary?.id)).toBe(false);
  });
});

describe("milestones (§14)", () => {
  it("reports the milestones reached", () => {
    expect(milestonesReached(0)).toEqual([]);
    expect(milestonesReached(74)).toEqual([25, 50]);
    expect(milestonesReached(100)).toEqual([25, 50, 75, 100]);
    expect(milestonesReached(180)).toEqual([25, 50, 75, 100]);
  });

  it("names the next milestone, and none once the goal is met", () => {
    expect(nextMilestone(0)).toBe(25);
    expect(nextMilestone(75)).toBe(100);
    expect(nextMilestone(100)).toBeNull();
    expect(nextMilestone(150)).toBeNull();
  });

  it("notifies each milestone exactly once, even when one gift crosses several", () => {
    expect(newlyCrossedMilestones(0, 80)).toEqual([25, 50, 75]);
    expect(newlyCrossedMilestones(75, 80)).toEqual([]);
    expect(newlyCrossedMilestones(75, 100)).toEqual([100]);
    expect(newlyCrossedMilestones(100, 250)).toEqual([]);
  });
});
