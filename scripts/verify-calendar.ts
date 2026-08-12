/**
 * End-to-end verification of the governed calendar workflow against a real Postgres DB.
 * Run: npx tsx scripts/verify-calendar.ts
 * It creates isolated fixtures (prefixed `vc_`), exercises the full lifecycle + security
 * boundaries, asserts outcomes, then cleans up. Exits non-zero on the first failed assertion.
 */
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/rbac";
import { saveEvent, transitionEvent, adminCreateEvent, resolveSubmitterDepartment, findConflicts, parseEventForm } from "@/lib/events";
import { getPublicEventBySlug, getPublicCalendarEvents } from "@/lib/public-content";
import { centralWallToUtc } from "@/lib/tz";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}`, extra ?? "");
  }
}
const wall = (s: string) => centralWallToUtc(s)!;

function input(over: Record<string, unknown> = {}) {
  return {
    title: "VC Youth Game Night",
    ministryId: undefined,
    category: "YOUTH" as const,
    summary: "An evening of games.",
    descriptionHtml: "<p>Come join <b>us</b>!</p><script>alert(1)</script>",
    startAt: wall("2026-09-12T18:00"),
    endAt: wall("2026-09-12T20:00"),
    allDay: false,
    locationType: "CHURCH" as const,
    venueName: "Gym",
    locationInstructions: undefined,
    contactName: "Pat Leader",
    contactEmail: "pat@example.com",
    contactPhone: undefined,
    contactPublic: false,
    registrationRequired: false,
    boardApprovalRequired: false,
    ...over,
  } as Parameters<typeof saveEvent>[1];
}

async function main() {
  // ---- Fixtures ----
  const [youth, music] = await Promise.all([
    prisma.ministry.upsert({ where: { slug: "vc-youth" }, update: {}, create: { name: "VC Youth", slug: "vc-youth" }, select: { id: true } }),
    prisma.ministry.upsert({ where: { slug: "vc-music" }, update: {}, create: { name: "VC Music", slug: "vc-music" }, select: { id: true } }),
  ]);
  const headUser = await prisma.user.upsert({
    where: { emailNormalized: "vc_head@x.local" },
    update: {}, create: { name: "VC Head", email: "vc_head@x.local", emailNormalized: "vc_head@x.local", passwordHash: "x", role: "MINISTRY_HEAD" }, select: { id: true },
  });
  const adminUser = await prisma.user.upsert({
    where: { emailNormalized: "vc_admin@x.local" },
    update: {}, create: { name: "VC Admin", email: "vc_admin@x.local", emailNormalized: "vc_admin@x.local", passwordHash: "x", role: "ADMIN" }, select: { id: true },
  });
  await prisma.userRole.deleteMany({ where: { userId: { in: [headUser.id, adminUser.id] } } });
  await prisma.userRole.createMany({ data: [
    { userId: headUser.id, role: "MINISTRY_HEAD", ministryId: youth.id, active: true },
    { userId: adminUser.id, role: "ADMIN", active: true },
  ] });

  const head: Actor = { userId: headUser.id, role: "MINISTRY_HEAD", roles: ["MEMBER", "MINISTRY_HEAD"], ministryIds: [youth.id] };
  const admin: Actor = { userId: adminUser.id, role: "ADMIN", roles: ["MEMBER", "ADMIN"] };

  console.log("\n1) Automatic + enforced department resolution");
  check("head with one dept resolves to it without input", (await resolveSubmitterDepartment(head, undefined)) === youth.id);
  check("head cannot resolve to a department they don't lead",
    await resolveSubmitterDepartment(head, music.id).then(() => false).catch(() => true));
  check("admin must name a department", await resolveSubmitterDepartment(admin, undefined).then(() => false).catch(() => true));
  check("admin may resolve any department", (await resolveSubmitterDepartment(admin, music.id)) === music.id);

  console.log("\n2) Draft create (sanitises HTML, ignores forged department)");
  const forged = await saveEvent(head, input({ ministryId: music.id }), undefined); // head forging music
  check("forged department submission is rejected", forged.ok === false, forged);
  const draft = await saveEvent(head, input(), undefined);
  if (!draft.ok) throw new Error("draft create failed: " + draft.error);
  const created = await prisma.event.findUniqueOrThrow({ where: { id: draft.id } });
  check("draft is DRAFT + owned by head's department", created.status === "DRAFT" && created.ministryId === youth.id);
  check("script tag sanitised out of description", !!created.descriptionHtml && !created.descriptionHtml.includes("<script"));
  check("non-public contact stored but flagged private", created.contactPublic === false && created.contactName === "Pat Leader");

  console.log("\n3) Submit → review → approve → publish");
  const sub = await transitionEvent(head, draft.id, "submit", { expectedVersion: draft.version });
  check("submit succeeds", sub.ok === true, sub);
  let ev = await prisma.event.findUniqueOrThrow({ where: { id: draft.id } });
  check("status is SUBMITTED with submittedAt + slug", ev.status === "SUBMITTED" && !!ev.submittedAt && !!ev.slug);
  check("admins were notified", (await prisma.notification.count({ where: { userId: adminUser.id, category: "calendar" } })) >= 1);

  check("head cannot approve (owner, not reviewer)", (await transitionEvent(head, draft.id, "approve", { expectedVersion: ev.version })).ok === false);
  check("start_review works for admin", (await transitionEvent(admin, draft.id, "start_review", { expectedVersion: ev.version })).ok === true);
  ev = await prisma.event.findUniqueOrThrow({ where: { id: draft.id } });
  const appr = await transitionEvent(admin, draft.id, "approve", { expectedVersion: ev.version });
  check("approve works", appr.ok === true, appr);
  ev = await prisma.event.findUniqueOrThrow({ where: { id: draft.id } });
  check("APPROVED is not publicly listed yet", ev.status === "APPROVED" && !(await getPublicCalendarEvents()).some((e) => e.id === draft.id));
  const pub = await transitionEvent(admin, draft.id, "publish", { expectedVersion: ev.version });
  check("publish works", pub.ok === true, pub);
  ev = await prisma.event.findUniqueOrThrow({ where: { id: draft.id } });
  check("PUBLISHED with publishedAt", ev.status === "PUBLISHED" && !!ev.publishedAt);
  check("now appears in public calendar", (await getPublicCalendarEvents()).some((e) => e.id === draft.id));
  check("reachable by public slug", !!(await getPublicEventBySlug(ev.slug!)));
  check("submitter notified across lifecycle", (await prisma.notification.count({ where: { userId: headUser.id, category: "calendar" } })) >= 1);

  console.log("\n4) Optimistic concurrency + stale version");
  check("stale-version transition is rejected", (await transitionEvent(admin, draft.id, "unpublish", { expectedVersion: 0 })).ok === false);

  console.log("\n5) Changes-requested loop (requires a comment; retains history)");
  const d2 = await saveEvent(head, input({ title: "VC Needs Work" }), undefined);
  if (!d2.ok) throw new Error("d2 failed");
  await transitionEvent(head, d2.id, "submit", { expectedVersion: d2.version });
  let e2 = await prisma.event.findUniqueOrThrow({ where: { id: d2.id } });
  check("request_changes without comment is rejected", (await transitionEvent(admin, d2.id, "request_changes", { expectedVersion: e2.version })).ok === false);
  const rc = await transitionEvent(admin, d2.id, "request_changes", { expectedVersion: e2.version, comment: "Please fix the date." });
  check("request_changes with comment works", rc.ok === true);
  e2 = await prisma.event.findUniqueOrThrow({ where: { id: d2.id } });
  check("CHANGES_REQUESTED surfaces adminFeedback to the head", e2.status === "CHANGES_REQUESTED" && e2.adminFeedback === "Please fix the date.");
  const resub = await transitionEvent(head, d2.id, "submit", { expectedVersion: e2.version });
  check("head can resubmit", resub.ok === true);
  e2 = await prisma.event.findUniqueOrThrow({ where: { id: d2.id } });
  check("resubmit increments submissionCount + clears feedback", e2.submissionCount === 2 && e2.adminFeedback === null);
  // create + submit + request_changes + resubmit = 4 history entries, none erased on resubmit.
  check("full history retained across the loop", (await prisma.eventReview.count({ where: { eventId: d2.id } })) >= 4);

  console.log("\n6) Board approval gating (data captured for admin verification)");
  const dBoard = await saveEvent(head, input({ title: "VC Board Event", boardApprovalRequired: true, boardApprovalState: "PENDING", boardApprovalRef: "Motion 12", boardNoteInternal: "secret" }), undefined);
  if (!dBoard.ok) throw new Error("board draft failed");
  const boardEv = await prisma.event.findUniqueOrThrow({ where: { id: dBoard.id } });
  check("board fields captured", boardEv.boardApprovalRequired && boardEv.boardApprovalState === "PENDING" && boardEv.boardApprovalRef === "Motion 12");
  const publicBoard = await getPublicEventBySlug(boardEv.slug ?? "___");
  check("internal board note never leaks publicly (event not published anyway)", publicBoard === null);

  console.log("\n7) Admin direct create + publish; cancellation retains history");
  const ac = await adminCreateEvent(admin, input({ title: "VC Admin Direct", ministryId: music.id }), { publish: true });
  check("admin can publish own authored event directly", ac.ok === true, ac);
  const acEv = await prisma.event.findUniqueOrThrow({ where: { id: (ac as { id: string }).id } });
  check("admin-created event is PUBLISHED with a slug", acEv.status === "PUBLISHED" && !!acEv.slug);
  const cancel = await transitionEvent(admin, acEv.id, "cancel", { expectedVersion: acEv.version });
  check("cancel works", cancel.ok === true);
  const cancelledEv = await prisma.event.findUniqueOrThrow({ where: { id: acEv.id } });
  check("CANCELLED (not deleted), reachable by slug but not listed",
    cancelledEv.status === "CANCELLED" &&
    !!(await getPublicEventBySlug(cancelledEv.slug!)) &&
    !(await getPublicCalendarEvents()).some((e) => e.id === acEv.id));

  console.log("\n8) Scheduling conflict detection (same venue, overlapping time)");
  const conflicts = await findConflicts({ startAt: wall("2026-09-12T19:00"), endAt: wall("2026-09-12T21:00"), venueName: "Gym", locationType: "CHURCH", excludeId: "none" });
  check("overlapping same-venue published event is detected", conflicts.some((c) => c.id === draft.id && c.sameVenue), conflicts.map((c) => c.title));
  const noConflict = await findConflicts({ startAt: wall("2026-12-01T10:00"), endAt: wall("2026-12-01T11:00"), venueName: "Gym", locationType: "CHURCH", excludeId: "none" });
  check("non-overlapping window has no conflict", noConflict.length === 0);

  console.log("\n9) All-day form parsing (date-only inputs widen to full-day wall times)");
  const fd = new FormData();
  fd.set("title", "VC All Day");
  fd.set("ministryId", youth.id);
  fd.set("allDay", "on");
  fd.set("startAt", "2026-10-03"); // <input type="date">
  fd.set("endAt", "2026-10-03");
  fd.set("locationType", "CHURCH");
  const parsed = parseEventForm(fd);
  check("all-day date-only inputs parse to valid start/end instants", parsed.allDay === true && parsed.startAt instanceof Date && parsed.endAt >= parsed.startAt);

  // ---- Cleanup ----
  const ids = await prisma.event.findMany({ where: { ministryId: { in: [youth.id, music.id] } }, select: { id: true } });
  await prisma.eventReview.deleteMany({ where: { eventId: { in: ids.map((i) => i.id) } } });
  await prisma.event.deleteMany({ where: { ministryId: { in: [youth.id, music.id] } } });
  await prisma.notification.deleteMany({ where: { userId: { in: [headUser.id, adminUser.id] } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [headUser.id, adminUser.id] } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: [headUser.id, adminUser.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [headUser.id, adminUser.id] } } });
  await prisma.ministry.deleteMany({ where: { id: { in: [youth.id, music.id] } } });

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED ✓" : `${failures} CHECK(S) FAILED ✗`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
