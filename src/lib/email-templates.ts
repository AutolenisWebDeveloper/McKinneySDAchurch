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
