/** Transactional templates for the approval workflow. User-supplied text is HTML-escaped. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export type Rendered = { subject: string; html: string };

export function pendingReviewEmail(p: { kind: "announcement" | "event"; title: string; ministryName: string; reviewUrl: string }): Rendered {
  return {
    subject: `Pending approval: ${p.kind} — ${p.title}`,
    html:
      `<p>A ${esc(p.kind)} from <strong>${esc(p.ministryName)}</strong> is awaiting your approval:</p>` +
      `<p><strong>${esc(p.title)}</strong></p>` +
      `<p><a href="${esc(p.reviewUrl)}">Review it in the dashboard</a></p>`,
  };
}

/** Calendar event lifecycle updates sent to the submitting department head. `url` is the
 *  dashboard event page. All user-supplied text (title, comment) is HTML-escaped. */
export function eventUpdateEmail(p: {
  title: string;
  ministryName: string;
  outcome: "changes_requested" | "approved" | "rejected" | "published" | "cancelled";
  comment?: string;
  url: string;
}): Rendered {
  const t = `<strong>${esc(p.title)}</strong>`;
  const lead: Record<typeof p.outcome, { subject: string; body: string }> = {
    changes_requested: {
      subject: `Changes requested: ${p.title}`,
      body: `<p>An administrator has requested changes to your event ${t} before it can be approved.</p>`,
    },
    approved: {
      subject: `Approved: ${p.title}`,
      body: `<p>Your event ${t} has been <strong>approved</strong>. It will appear on the public calendar once an administrator publishes it.</p>`,
    },
    rejected: {
      subject: `Not approved: ${p.title}`,
      body: `<p>Your event ${t} was <strong>not approved</strong>.</p>`,
    },
    published: {
      subject: `Published: ${p.title}`,
      body: `<p>Your event ${t} is now <strong>live on the public calendar</strong>.</p>`,
    },
    cancelled: {
      subject: `Cancelled: ${p.title}`,
      body: `<p>Your event ${t} has been <strong>cancelled</strong>.</p>`,
    },
  };
  const { subject, body } = lead[p.outcome];
  return {
    subject,
    html:
      body +
      (p.comment ? `<p><strong>Note from the reviewer:</strong> ${esc(p.comment)}</p>` : "") +
      `<p><a href="${esc(p.url)}">Open it in your dashboard</a></p>` +
      `<p style="color:#667">${esc(p.ministryName)}</p>`,
  };
}

export function decisionEmail(p: { kind: string; title: string; approved: boolean; reason?: string }): Rendered {
  const body = p.approved
    ? `<p>Your ${esc(p.kind)} “<strong>${esc(p.title)}</strong>” has been approved and published.</p>`
    : `<p>Your ${esc(p.kind)} “<strong>${esc(p.title)}</strong>” was not approved.</p>` +
      (p.reason ? `<p><strong>Reason:</strong> ${esc(p.reason)}</p>` : "");
  return { subject: `Your ${p.kind} was ${p.approved ? "approved" : "returned"}: ${p.title}`, html: body };
}

export function welcomeVisitorEmail(p: { name: string }): Rendered {
  return {
    subject: "Welcome to McKinney SDA Church",
    html: `<p>Hi ${esc(p.name)},</p><p>Thank you for visiting us — we're so glad you came. We'd love to worship with you again this Sabbath.</p>`,
  };
}

/** Marketing invite. Carries a visible unsubscribe link in addition to the RFC 8058 header. */
export function weeklyInviteEmail(p: { name: string; planVisitUrl: string; unsubscribeUrl: string }): Rendered {
  return {
    subject: "Join us this Sabbath",
    html:
      `<p>Hi ${esc(p.name)},</p>` +
      `<p>We'd love to see you this Sabbath at McKinney SDA Church.</p>` +
      `<p><a href="${esc(p.planVisitUrl)}">Plan your visit</a></p>` +
      `<p style="font-size:12px;color:#666">To stop receiving these invitations, <a href="${esc(p.unsubscribeUrl)}">unsubscribe</a>.</p>`,
  };
}

export function deptHeadReminderEmail(p: { submitUrl: string }): Rendered {
  return {
    subject: "Weekly reminder: submit your announcements & events",
    html: `<p>Please submit this week's ministry announcements and calendar events for approval.</p><p><a href="${esc(p.submitUrl)}">Open the dashboard</a></p>`,
  };
}

export function constructionUpdateEmail(p: { title: string; body: string; url: string; unsubscribeUrl: string }): Rendered {
  return {
    subject: `Building update: ${p.title}`,
    html:
      `<h2>${esc(p.title)}</h2><p>${esc(p.body)}</p>` +
      `<p><a href="${esc(p.url)}">See the building project page</a></p>` +
      `<p style="font-size:12px;color:#666">To stop receiving building updates, <a href="${esc(p.unsubscribeUrl)}">unsubscribe</a>.</p>`,
  };
}

export function inviteEmail(p: { roleLabel: string; ministryName?: string; acceptUrl: string; churchName: string }): Rendered {
  const where = p.ministryName ? ` for ${esc(p.ministryName)}` : "";
  return {
    subject: `You're invited to ${esc(p.churchName)} — ${esc(p.roleLabel)}`,
    html:
      `<h2>Welcome to ${esc(p.churchName)}</h2>` +
      `<p>You've been invited to create an account as <strong>${esc(p.roleLabel)}</strong>${where}.</p>` +
      `<p><a href="${esc(p.acceptUrl)}">Set up your account</a>. This link expires in 7 days.</p>` +
      `<p style="font-size:12px;color:#666">If you weren't expecting this, you can ignore this email.</p>`,
  };
}

/* ===== Phase 2: member account requests (§20/§38) ===== */

export function accountRequestReceivedEmail(p: { firstName: string; churchName: string }): Rendered {
  return {
    subject: `We received your account request — ${esc(p.churchName)}`,
    html:
      `<h2>Thanks, ${esc(p.firstName)}</h2>` +
      `<p>We received your request for a member account at ${esc(p.churchName)}. ` +
      `A church administrator will review it and confirm your membership. ` +
      `You'll get an email as soon as your account is ready.</p>` +
      `<p style="font-size:12px;color:#666">If you didn't request this, you can ignore this email.</p>`,
  };
}

export function accountApprovedEmail(p: { firstName: string; churchName: string; loginUrl: string; auto: boolean }): Rendered {
  return {
    subject: `Your account is ready — ${esc(p.churchName)}`,
    html:
      `<h2>Welcome, ${esc(p.firstName)}</h2>` +
      `<p>Your member account at ${esc(p.churchName)} is ${p.auto ? "approved" : "now approved"} and ready to use.</p>` +
      `<p><a href="${esc(p.loginUrl)}">Sign in</a> with the email and password you chose.</p>`,
  };
}

export function accountNeedsInfoEmail(p: { firstName: string; churchName: string; note: string; contactEmail: string }): Rendered {
  return {
    subject: `A little more information needed — ${esc(p.churchName)}`,
    html:
      `<h2>Hello ${esc(p.firstName)}</h2>` +
      `<p>Before we can finish setting up your account, we need a bit more information:</p>` +
      `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">${esc(p.note)}</blockquote>` +
      `<p>Please reply to <a href="mailto:${esc(p.contactEmail)}">${esc(p.contactEmail)}</a> and we'll take it from there.</p>`,
  };
}

export function accountRejectedEmail(p: { firstName: string; churchName: string; reason?: string; contactEmail: string }): Rendered {
  return {
    subject: `About your account request — ${esc(p.churchName)}`,
    html:
      `<h2>Hello ${esc(p.firstName)}</h2>` +
      `<p>We're sorry, but we weren't able to approve your member account request at this time.</p>` +
      (p.reason ? `<p>${esc(p.reason)}</p>` : "") +
      `<p>If you believe this is a mistake, please contact <a href="mailto:${esc(p.contactEmail)}">${esc(p.contactEmail)}</a>.</p>`,
  };
}

/* ===== Phase 4: WorkItem communications (care / contact / message / support) ===== */

export function workItemReceivedEmail(p: { firstName: string; kind: string; churchName: string; reference: string }): Rendered {
  return {
    subject: `We received your ${esc(p.kind)} — ${esc(p.churchName)}`,
    html:
      `<h2>Thank you${p.firstName ? `, ${esc(p.firstName)}` : ""}</h2>` +
      `<p>We've received your ${esc(p.kind)} and a member of our team will follow up with you personally.</p>` +
      `<p>Your reference is <strong>${esc(p.reference)}</strong>.</p>` +
      `<p style="font-size:12px;color:#666">If this wasn't you, please disregard this message.</p>`,
  };
}

export function workItemResolvedEmail(p: { firstName: string; kind: string; churchName: string; note?: string }): Rendered {
  return {
    subject: `Update on your ${esc(p.kind)} — ${esc(p.churchName)}`,
    html:
      `<h2>Hello${p.firstName ? ` ${esc(p.firstName)}` : ""}</h2>` +
      `<p>We've followed up on your ${esc(p.kind)} and marked it resolved.</p>` +
      (p.note ? `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">${esc(p.note)}</blockquote>` : "") +
      `<p>If you need anything further, simply reply and we'll be glad to help.</p>`,
  };
}

/* ===== Phase 3: Weekly Communications (§22/§23) ===== */

export function weeklyRequestEmail(p: { sabbathDate: string; submitUrl: string; deadline?: string }): Rendered {
  return {
    subject: `This week's bulletin — please send your ministry's items`,
    html:
      `<h2>Weekly communications for Sabbath ${esc(p.sabbathDate)}</h2>` +
      `<p>Please submit your ministry's announcements, events, Sabbath program items, and updates —` +
      ` or let us know there's nothing this week.</p>` +
      (p.deadline ? `<p><strong>Deadline:</strong> ${esc(p.deadline)}.</p>` : "") +
      `<p><a href="${esc(p.submitUrl)}">Submit this week's items</a></p>`,
  };
}

export function packetSubmissionDecisionEmail(p: { title: string; decision: "accepted" | "rejected" | "needs_info"; note?: string }): Rendered {
  const word = p.decision === "accepted" ? "accepted" : p.decision === "rejected" ? "not included" : "needs a little more information";
  return {
    subject: `Your bulletin submission was ${word}`,
    html:
      `<h2>Bulletin submission update</h2>` +
      `<p>Your submission <strong>${esc(p.title)}</strong> was <strong>${esc(word)}</strong>.</p>` +
      (p.note ? `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">${esc(p.note)}</blockquote>` : ""),
  };
}

export function packetPublishedEmail(p: { sabbathDate: string; url: string }): Rendered {
  return {
    subject: `This week's bulletin is ready — Sabbath ${esc(p.sabbathDate)}`,
    html:
      `<h2>The bulletin for Sabbath ${esc(p.sabbathDate)} is published</h2>` +
      `<p><a href="${esc(p.url)}">View this week's bulletin and order of service</a>.</p>`,
  };
}

/* ----- Weekly bulletin: department-head reminders (§11/§12) ----- */

const MONDAY_STANDING: Record<string, string> = {
  NONE: "You haven't started an announcement for this week yet.",
  DRAFT: "You have a draft that hasn't been submitted yet.",
  SUBMITTED: "Thank you — your announcement is submitted. No action is needed.",
  CHANGES_REQUESTED: "An admin has requested changes to your submission.",
  NOTHING: "You've marked that your ministry has nothing this week. Thank you!",
};

/** Monday reminder — identifies the Sabbath, the deadline, and the head's current standing (§11). */
export function bulletinMondayReminderEmail(p: {
  sabbathDate: string; deadline?: string; workspaceUrl: string; personalState: string;
}): Rendered {
  const standing = MONDAY_STANDING[p.personalState] ?? MONDAY_STANDING.NONE;
  return {
    subject: `Bulletin submissions open — Sabbath ${esc(p.sabbathDate)}`,
    html:
      `<h2>Preparing the bulletin for Sabbath ${esc(p.sabbathDate)}</h2>` +
      `<p>${esc(standing!)}</p>` +
      (p.deadline ? `<p><strong>Submission deadline:</strong> ${esc(p.deadline)}.</p>` : "") +
      `<p><a href="${esc(p.workspaceUrl)}">Open your Weekly Bulletin workspace</a> to add or finish an announcement, or mark that you have nothing this week.</p>`,
  };
}

const WEDNESDAY_COPY: Record<string, { subject: string; body: string }> = {
  NO_SUBMISSION: {
    subject: "Reminder: your ministry hasn't submitted for this Sabbath's bulletin",
    body: "We haven't received anything from your ministry for this week's bulletin. If you have an announcement, please add it — or let us know there's nothing this week.",
  },
  DRAFT: {
    subject: "Your bulletin announcement is still a draft",
    body: "You have an unfinished draft that hasn't been submitted for review yet. Please finish and submit it before the deadline.",
  },
  CHANGES_REQUESTED: {
    subject: "Action needed: changes requested on your bulletin announcement",
    body: "An admin has requested changes to your submission. Please review their feedback and resubmit.",
  },
};

/** Wednesday targeted reminder — content depends on the head's resolved state; never blanket (§12). */
export function bulletinWednesdayReminderEmail(p: {
  sabbathDate: string; deadline?: string; workspaceUrl: string; state: string;
}): Rendered {
  const copy = WEDNESDAY_COPY[p.state] ?? WEDNESDAY_COPY.NO_SUBMISSION;
  return {
    subject: `${copy!.subject} — Sabbath ${esc(p.sabbathDate)}`,
    html:
      `<h2>Bulletin for Sabbath ${esc(p.sabbathDate)}</h2>` +
      `<p>${esc(copy!.body)}</p>` +
      (p.deadline ? `<p><strong>Deadline:</strong> ${esc(p.deadline)}.</p>` : "") +
      `<p><a href="${esc(p.workspaceUrl)}">Open your Weekly Bulletin workspace</a>.</p>`,
  };
}

/* ----- Weekly bulletin: Friday 5PM member distribution (§18) ----- */

/** The Friday member email. Professionally designed, branded; highlights + actions, not a dump. */
export function memberBulletinEmail(p: {
  sabbathDate: string;
  sermonTitle?: string;
  speaker?: string;
  highlights: string[];
  bulletinUrl: string;
  pdfUrl?: string;
  watchUrl?: string;
  unsubscribeUrl: string;
}): Rendered {
  const navy = "#003B5C";
  const btn = (href: string, label: string, primary = false) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:11px 20px;border-radius:999px;` +
    `font-weight:600;text-decoration:none;font-size:14px;` +
    (primary ? `background:${navy};color:#ffffff;` : `background:#ffffff;color:${navy};border:1px solid ${navy};`) +
    `">${esc(label)}</a>`;
  const sermon = p.sermonTitle
    ? `<p style="margin:0 0 4px;font-size:18px;color:${navy};font-weight:600">${esc(p.sermonTitle)}</p>` +
      (p.speaker ? `<p style="margin:0 0 16px;color:#53636e">with ${esc(p.speaker)}</p>` : "")
    : "";
  const highlights = p.highlights.length
    ? `<p style="margin:20px 0 8px;font-weight:600;color:${navy}">This week's highlights</p><ul style="margin:0 0 8px;padding-left:20px;color:#132a3a">` +
      p.highlights.slice(0, 5).map((h) => `<li style="margin:4px 0">${esc(h)}</li>`).join("") +
      `</ul>`
    : "";
  return {
    subject: `Happy Sabbath — this week's bulletin (${esc(p.sabbathDate)})`,
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#132a3a">` +
      `<div style="background:${navy};color:#fff;padding:24px;border-radius:12px 12px 0 0">` +
      `<p style="margin:0;font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">McKinney SDA Church</p>` +
      `<h1 style="margin:6px 0 0;font-size:22px">Happy Sabbath</h1>` +
      `<p style="margin:6px 0 0;opacity:.9">Sabbath ${esc(p.sabbathDate)}</p></div>` +
      `<div style="border:1px solid #d6e1e7;border-top:0;border-radius:0 0 12px 12px;padding:24px">` +
      sermon + highlights +
      `<div style="margin:20px 0 4px">` +
      btn(p.bulletinUrl, "Read this week's bulletin", true) +
      (p.pdfUrl ? btn(p.pdfUrl, "Download PDF") : "") +
      (p.watchUrl ? btn(p.watchUrl, "Watch Live") : "") +
      `</div>` +
      `<p style="margin:20px 0 0;font-size:12px;color:#7a909c">You're receiving this because you're part of the McKinney SDA Church family. ` +
      `<a href="${esc(p.unsubscribeUrl)}" style="color:#7a909c">Manage your email preferences</a>.</p>` +
      `</div></div>`,
  };
}

/* ===== Phase 5: Membership transfers (§29) ===== */

export function transferReceivedEmail(p: { name: string; direction: "INCOMING" | "OUTGOING"; churchName: string; statusUrl?: string }): Rendered {
  const dir = p.direction === "INCOMING" ? "into" : "out of";
  return {
    subject: `We received your membership transfer request`,
    html:
      `<h2>Hello ${esc(p.name)}</h2>` +
      `<p>We've received your request to transfer your membership ${dir} ${esc(p.churchName)}. ` +
      `Our church secretary will process it through the official Adventist membership system (eAdventist).</p>` +
      (p.statusUrl ? `<p><a href="${esc(p.statusUrl)}">Check the status of your transfer</a></p>` : ""),
  };
}

export function transferConfirmationRequestEmail(p: { name: string; churchName: string; otherChurch: string; confirmUrl: string }): Rendered {
  return {
    subject: `Please confirm your membership transfer`,
    html:
      `<h2>Hello ${esc(p.name)}</h2>` +
      `<p>${esc(p.churchName)} has begun a request to transfer your membership to <strong>${esc(p.otherChurch)}</strong> on your behalf.</p>` +
      `<p>Please confirm this is your wish — nothing is processed until you do.</p>` +
      `<p><a href="${esc(p.confirmUrl)}">Confirm or decline this transfer</a></p>` +
      `<p style="font-size:12px;color:#666">If you did not expect this, please decline and contact the church office.</p>`,
  };
}

export function transferConfirmedEmail(p: { name: string; churchName: string }): Rendered {
  return {
    subject: `Thank you — your transfer is confirmed`,
    html:
      `<h2>Hello ${esc(p.name)}</h2>` +
      `<p>Thank you for confirming. ${esc(p.churchName)}'s secretary will now process your transfer through eAdventist.</p>`,
  };
}

export function transferDisputedNotice(p: { name: string; otherChurch: string }): Rendered {
  return {
    subject: `Transfer declined by member — needs review`,
    html:
      `<h2>Member declined a transfer</h2>` +
      `<p><strong>${esc(p.name)}</strong> declined the on-behalf transfer to <strong>${esc(p.otherChurch)}</strong>. ` +
      `Ordinary processing is locked until leadership reviews it.</p>`,
  };
}

export function transferCompletedEmail(p: { name: string; churchName: string }): Rendered {
  return {
    subject: `Your membership transfer is complete`,
    html:
      `<h2>Hello ${esc(p.name)}</h2>` +
      `<p>Your membership transfer has been completed in the official Adventist record. God bless you.</p>` +
      `<p style="font-size:12px;color:#666">— ${esc(p.churchName)}</p>`,
  };
}

export function memberInfoInviteEmail(p: { churchName: string; url: string; note?: string }): Rendered {
  return {
    subject: `${p.churchName} — Member Information Form`,
    html:
      `<p>Hello,</p>` +
      `<p>${esc(p.churchName)} invites you to fill out our Member Information Form so we can keep our church family records up to date.</p>` +
      (p.note ? `<p>${esc(p.note)}</p>` : "") +
      `<p><a href="${esc(p.url)}">Open the Member Information Form</a></p>` +
      `<p>Your information is submitted securely and used only for church administration.</p>`,
  };
}
