import { describe, it, expect } from "vitest";
import {
  ALL_EVENT_STATUSES,
  EVENT_TRANSITIONS,
  canDoEventAction,
  allowedEventActions,
  evaluateEventAction,
  EventTransitionError,
  isPubliclyListed,
  isPubliclyReachable,
  type EventAction,
  type EventLike,
} from "@/lib/event-workflow";

const owner = { userId: "owner-1", kind: "owner" as const };
const reviewer = { userId: "admin-1", kind: "reviewer" as const };
const draft = (over: Partial<EventLike> = {}): EventLike => ({ status: "DRAFT", createdById: "owner-1", version: 0, ...over });

describe("event lifecycle graph", () => {
  it("a department head submits a draft; it cannot self-approve", () => {
    const t = evaluateEventAction(draft(), "submit", owner, { expectedVersion: 0 });
    expect(t.to).toBe("SUBMITTED");
    // owner cannot approve — wrong actor kind
    expect(() => evaluateEventAction(draft({ status: "SUBMITTED" }), "approve", owner)).toThrow(EventTransitionError);
  });

  it("approval and publication are distinct states", () => {
    const approved = evaluateEventAction({ status: "UNDER_REVIEW", createdById: "owner-1", version: 3 }, "approve", reviewer, { expectedVersion: 3 });
    expect(approved.to).toBe("APPROVED");
    // Approved is NOT public yet.
    expect(isPubliclyListed("APPROVED")).toBe(false);
    const published = evaluateEventAction({ status: "APPROVED", createdById: "owner-1", version: 4 }, "publish", reviewer);
    expect(published.to).toBe("PUBLISHED");
    expect(isPubliclyListed("PUBLISHED")).toBe(true);
  });

  it("request_changes and reject require a comment", () => {
    const item: EventLike = { status: "SUBMITTED", createdById: "owner-1", version: 1 };
    expect(() => evaluateEventAction(item, "request_changes", reviewer, { comment: "  " })).toThrow(/COMMENT_REQUIRED/);
    expect(() => evaluateEventAction(item, "reject", reviewer, {})).toThrow(/COMMENT_REQUIRED/);
    expect(evaluateEventAction(item, "request_changes", reviewer, { comment: "Fix the date" }).to).toBe("CHANGES_REQUESTED");
  });

  it("changes-requested returns to the department head and back through review", () => {
    const t = evaluateEventAction({ status: "CHANGES_REQUESTED", createdById: "owner-1", version: 2 }, "submit", owner);
    expect(t.to).toBe("SUBMITTED");
  });

  it("separation of duties: the author cannot approve or publish their own event", () => {
    const selfAdmin = { userId: "same", kind: "reviewer" as const };
    const item: EventLike = { status: "SUBMITTED", createdById: "same", version: 0 };
    expect(() => evaluateEventAction(item, "approve", selfAdmin)).toThrow(/SELF_REVIEW_FORBIDDEN/);
    // ...unless governance explicitly allows it.
    expect(evaluateEventAction(item, "approve", selfAdmin, { allowSelfReview: true }).to).toBe("APPROVED");
  });

  it("published can be unpublished (back to approved) or cancelled, never silently deleted", () => {
    expect(evaluateEventAction({ status: "PUBLISHED", createdById: "o", version: 0 }, "unpublish", reviewer).to).toBe("APPROVED");
    expect(evaluateEventAction({ status: "PUBLISHED", createdById: "o", version: 0 }, "cancel", reviewer).to).toBe("CANCELLED");
  });

  it("cancelled events remain reachable at their URL but are not listed", () => {
    expect(isPubliclyListed("CANCELLED")).toBe(false);
    expect(isPubliclyReachable("CANCELLED")).toBe(true);
    expect(isPubliclyReachable("DRAFT")).toBe(false);
    expect(isPubliclyReachable("APPROVED")).toBe(false);
  });

  it("rejects a stale version (optimistic concurrency guard)", () => {
    expect(() => evaluateEventAction(draft({ version: 5 }), "submit", owner, { expectedVersion: 4 })).toThrow(/STALE_VERSION/);
  });

  it("no draft/submitted/rejected/changes-requested status is ever publicly listed", () => {
    for (const s of ALL_EVENT_STATUSES) {
      if (s !== "PUBLISHED") expect(isPubliclyListed(s)).toBe(false);
    }
  });

  it("every transition's `to` is a real status and `from` list is non-empty", () => {
    for (const action of Object.keys(EVENT_TRANSITIONS) as EventAction[]) {
      const spec = EVENT_TRANSITIONS[action];
      expect(ALL_EVENT_STATUSES).toContain(spec.to);
      expect(spec.from.length).toBeGreaterThan(0);
      for (const f of spec.from) expect(ALL_EVENT_STATUSES).toContain(f);
    }
  });

  it("allowedEventActions matches canDoEventAction for both actor kinds", () => {
    for (const s of ALL_EVENT_STATUSES) {
      for (const kind of ["owner", "reviewer"] as const) {
        const actor = kind === "owner" ? owner : reviewer;
        for (const a of allowedEventActions(s, kind)) {
          expect(canDoEventAction(s, a, kind)).toBe(true);
          // and it evaluates without a graph error (ignoring comment/self-review rules)
          const needsComment = EVENT_TRANSITIONS[a].requiresComment;
          const t = evaluateEventAction(
            { status: s, createdById: "someone-else", version: 0 },
            a,
            actor,
            { comment: needsComment ? "reason" : undefined },
          );
          expect(t.from).toBe(s);
        }
      }
    }
  });

  it("owner may only submit/discard; reviewer holds every editorial action", () => {
    const ownerActions = new Set<EventAction>();
    const reviewerActions = new Set<EventAction>();
    for (const s of ALL_EVENT_STATUSES) {
      allowedEventActions(s, "owner").forEach((a) => ownerActions.add(a));
      allowedEventActions(s, "reviewer").forEach((a) => reviewerActions.add(a));
    }
    expect([...ownerActions].sort()).toEqual(["discard", "submit"]);
    expect(reviewerActions.has("approve")).toBe(true);
    expect(reviewerActions.has("publish")).toBe(true);
    expect(reviewerActions.has("submit")).toBe(false);
  });
});
