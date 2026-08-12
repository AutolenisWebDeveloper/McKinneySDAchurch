import { prisma } from "./db";
import { env } from "@/env";
import { sendEmail } from "./email";
import { notifyRoles } from "./notify";
import { getSetting } from "./site";
import { segmentWhere, buildRecipientList } from "./segments";
import { unsubscribeToken } from "./unsubscribe";
import { memberBulletinEmail } from "./email-templates";
import { getPublishedBulletin } from "./bulletin-view";
import { church } from "@/components/site-info";
import { upcomingSabbath } from "./weekly-packet";
import { bulletinFridayInstant, isFridayDistributionDue } from "./bulletin-schedule";

/**
 * Friday 5:00 PM America/Chicago member distribution (§18). Sends the final published bulletin to
 * eligible members through the existing email pipeline (suppression, one-click unsubscribe,
 * minor-safe segments, WEEKLY_BULLETIN preference). Idempotent: the BulletinDistribution row is a
 * unique (bulletin, channel) lock, so a retry/duplicate run never double-sends. If nothing is
 * published, it alerts admins instead of shipping an unfinished bulletin.
 */

const CHANNEL = "FRIDAY_EMAIL";
export type DistributionResult =
  | { ok: true; bulletinId: string; recipients: number; sent: number; suppressed: number }
  | { ok: false; skipped: true; reason: string; alerted?: boolean };

export async function runFridayDistribution(now: Date = new Date()): Promise<DistributionResult> {
  const sabbath = upcomingSabbath(now);
  if (!isFridayDistributionDue(now, sabbath)) return { ok: false, skipped: true, reason: "not-due" };

  const bulletin = await prisma.bulletin.findFirst({
    where: { sabbathDate: sabbath, status: "APPROVED", publishedAt: { not: null } },
    select: { id: true, slug: true, sermonTitle: true, speaker: true, sabbathDate: true },
  });

  if (!bulletin) {
    // Never send an unfinished bulletin — alert admins instead (§18/§13).
    await notifyRoles(["ADMIN", "PASTOR"], {
      category: "weekly-packet",
      title: "Friday distribution skipped — no bulletin is published for this Sabbath",
      deepLink: "/dashboard/admin/weekly",
    });
    return { ok: false, skipped: true, reason: "no-published-bulletin", alerted: true };
  }

  // Idempotency lock: first run claims the (bulletin, channel) row; any duplicate run bails here.
  try {
    await prisma.bulletinDistribution.create({
      data: { bulletinId: bulletin.id, channel: CHANNEL, status: "PENDING", scheduledFor: bulletinFridayInstant(sabbath) },
    });
  } catch {
    return { ok: false, skipped: true, reason: "already-distributed" };
  }

  const slug = bulletin.slug ?? bulletin.sabbathDate.toISOString().slice(0, 10);
  const sabbathLabel = slug;
  const site = env.NEXT_PUBLIC_SITE_URL;
  const bulletinUrl = `${site}/bulletin/${slug}`;
  const pdfUrl = `${site}/bulletin/${slug}/print`;
  const watchUrl = (await getSetting("livestream_url")) ?? church.social.livestream ?? undefined;

  const view = await getPublishedBulletin(slug, "online");
  const highlights = (view?.announcements ?? [])
    .filter((a) => a.title)
    .slice(0, 5)
    .map((a) => a.title);

  const members = await prisma.member.findMany({
    where: segmentWhere("ACTIVE_MEMBERS"),
    select: { isMinor: true, dateOfBirth: true, email: true },
  });
  const recipients = buildRecipientList(members);

  let sent = 0;
  let suppressed = 0;
  try {
    for (const email of recipients) {
      const unsubscribeUrl = `${site}/api/email/unsubscribe/${unsubscribeToken(email, "WEEKLY_BULLETIN")}`;
      const { subject, html } = memberBulletinEmail({
        sabbathDate: sabbathLabel,
        sermonTitle: bulletin.sermonTitle ?? undefined,
        speaker: bulletin.speaker ?? undefined,
        highlights,
        bulletinUrl,
        pdfUrl,
        watchUrl,
        unsubscribeUrl,
      });
      const res = await sendEmail({ to: email, subject, html, type: "MARKETING", listType: "WEEKLY_BULLETIN" });
      if (res.sent) sent++;
      else suppressed++;
    }
    await prisma.bulletinDistribution.update({
      where: { bulletinId_channel: { bulletinId: bulletin.id, channel: CHANNEL } },
      data: { status: "SENT", recipientCount: recipients.length, sentCount: sent, suppressedCount: suppressed, completedAt: new Date() },
    });
  } catch (e) {
    await prisma.bulletinDistribution.update({
      where: { bulletinId_channel: { bulletinId: bulletin.id, channel: CHANNEL } },
      data: { status: "FAILED", recipientCount: recipients.length, sentCount: sent, suppressedCount: suppressed, error: String(e).slice(0, 500) },
    });
    await notifyRoles(["ADMIN", "PASTOR"], {
      category: "weekly-packet",
      title: "Friday bulletin distribution failed — please review",
      deepLink: "/dashboard/admin/weekly",
    });
    return { ok: false, skipped: true, reason: "send-error" };
  }

  return { ok: true, bulletinId: bulletin.id, recipients: recipients.length, sent, suppressed };
}
