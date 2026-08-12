import { prisma } from "./db";
import { env } from "@/env";
import { sendEmail } from "./email";
import { longDate } from "./dates";
import { bulletinMondayReminderEmail, bulletinWednesdayReminderEmail } from "./email-templates";
import { getOrCreatePacket } from "./weekly-packets";
import { upcomingSabbath, normalizeSubmissionState } from "./weekly-packet";
import {
  bulletinFridayInstant, resolveWednesdayReminderState, resolveMondayPersonalState,
  type ReminderSubmissionView,
} from "./bulletin-schedule";

/**
 * Department-head reminder engine (§11/§12). Monday and Wednesday flow through this ONE service
 * (not a second reminder path). Idempotency is per (packet, kind, recipient) via the
 * BulletinReminder ledger — claimed before the send, so a cron re-run never double-emails.
 */

type ReminderKind = "MONDAY" | "WEDNESDAY";
export type ReminderRunResult = { packetId: string; sabbathDate: string; considered: number; sent: number; skipped: number; failed: number };

const workspaceUrl = () => `${env.NEXT_PUBLIC_SITE_URL}/dashboard/ministry/bulletin`;

/** Gather each active ministry head with the set of ministries they lead + their packet submissions. */
async function gatherHeads(packetId: string) {
  const roles = await prisma.userRole.findMany({
    where: { active: true, role: "MINISTRY_HEAD" },
    select: { userId: true, ministryId: true },
  });
  const byUser = new Map<string, Set<string>>();
  for (const r of roles) {
    const set = byUser.get(r.userId) ?? new Set<string>();
    if (r.ministryId) set.add(r.ministryId);
    byUser.set(r.userId, set);
  }
  const userIds = [...byUser.keys()];
  const [users, subs] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }),
    prisma.packetSubmission.findMany({
      where: { packetId },
      select: { ministryId: true, submittedById: true, status: true, kind: true },
    }),
  ]);
  return users.map((u) => {
    const ministries = byUser.get(u.id) ?? new Set<string>();
    const mine = subs.filter((s) => (s.ministryId && ministries.has(s.ministryId)) || s.submittedById === u.id);
    const views: ReminderSubmissionView[] = mine.map((s) => ({
      state: normalizeSubmissionState(s.status),
      isNothing: s.kind === "NOTHING_THIS_WEEK",
    }));
    return { userId: u.id, email: u.email, views };
  });
}

/** Claim a reminder slot atomically; returns true if THIS run should send (row didn't exist). */
async function claim(packetId: string, kind: ReminderKind, userId: string, state: string | null): Promise<boolean> {
  try {
    await prisma.bulletinReminder.create({ data: { packetId, kind, userId, state } });
    return true;
  } catch {
    return false; // unique (packetId, kind, userId) violated → already reminded this week
  }
}

async function runReminders(kind: ReminderKind, now: Date): Promise<ReminderRunResult> {
  const packetId = await getOrCreatePacket();
  const sabbath = upcomingSabbath(now);
  const sabbathDate = sabbath.toISOString().slice(0, 10);
  const deadline = `${longDate(new Date(bulletinFridayInstant(sabbath)))} at 5:00 PM CT`;
  const heads = await gatherHeads(packetId);

  let sent = 0, skipped = 0, failed = 0, considered = 0;
  for (const head of heads) {
    if (!head.email) continue;
    considered++;

    let state: string | null;
    let render: { subject: string; html: string };
    if (kind === "MONDAY") {
      state = resolveMondayPersonalState(head.views);
      render = bulletinMondayReminderEmail({ sabbathDate, deadline, workspaceUrl: workspaceUrl(), personalState: state });
    } else {
      const wed = resolveWednesdayReminderState(head.views);
      if (!wed) { skipped++; continue; } // targeted: nothing to nag about
      state = wed;
      render = bulletinWednesdayReminderEmail({ sabbathDate, deadline, workspaceUrl: workspaceUrl(), state: wed });
    }

    // Idempotency: claim before sending so a duplicate cron run can never re-send.
    if (!(await claim(packetId, kind, head.userId, state))) { skipped++; continue; }
    const res = await sendEmail({ to: head.email, subject: render.subject, html: render.html, type: "TRANSACTIONAL" });
    if (res.sent) sent++; else failed++;
  }
  return { packetId, sabbathDate, considered, sent, skipped, failed };
}

export const runMondayBulletinReminders = (now: Date = new Date()) => runReminders("MONDAY", now);
export const runWednesdayBulletinReminders = (now: Date = new Date()) => runReminders("WEDNESDAY", now);
