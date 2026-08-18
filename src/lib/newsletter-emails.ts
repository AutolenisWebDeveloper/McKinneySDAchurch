/**
 * Monthly-newsletter email builders (§7/§10/§12/§22). Pure `{subject, html}` renderers — all
 * user-supplied text is HTML-escaped. The member *edition* email (§22) is built specifically for
 * email clients: inline styles only, a ~600px content width, touch-friendly CTAs, alt text on
 * images, and graceful degradation when images are disabled. Sent through the shared `sendEmail`
 * pipeline (TRANSACTIONAL for department mail; MARKETING + listType "NEWSLETTER" for the edition).
 */

export type Rendered = { subject: string; html: string };

const NAVY = "#003B5C";
const INK = "#132a3a";
const SLATE = "#53636e";
const LINE = "#d6e1e7";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function btn(href: string, label: string, primary = false): string {
  return (
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:11px 20px;border-radius:999px;` +
    `font-weight:600;text-decoration:none;font-size:14px;` +
    (primary ? `background:${NAVY};color:#ffffff;` : `background:#ffffff;color:${NAVY};border:1px solid ${NAVY};`) +
    `">${esc(label)}</a>`
  );
}

/* ---------- Department-facing transactional mail ---------- */

/** §7 — Initial monthly content request to a department head. */
export function newsletterContentRequestEmail(p: {
  ministryName: string;
  monthLabel: string;
  submitUrl: string;
  deadline?: string;
}): Rendered {
  return {
    subject: `Share Your Ministry Updates for the ${p.monthLabel} McKinney SDA Newsletter`,
    html:
      `<p>Hello ${esc(p.ministryName)} team,</p>` +
      `<p>McKinney SDA Church is preparing the <strong>${esc(p.monthLabel)}</strong> monthly newsletter, and we'd love to include ` +
      `anything meaningful from your ministry — news, announcements, upcoming events, accomplishments, testimonies, outreach, ` +
      `photos, volunteer opportunities, or important dates.</p>` +
      `<p>You don't need to worry about design or layout. Just tell us what you'd like the church family to know, and our ` +
      `Communications team will handle the rest.</p>` +
      (p.deadline ? `<p><strong>Submission deadline:</strong> ${esc(p.deadline)}.</p>` : "") +
      `<p>${btn(p.submitUrl, "Submit Newsletter Content", true)}</p>` +
      `<p style="font-size:12px;color:${SLATE}">This link takes you straight to your ministry's submission form.</p>`,
  };
}

/** §10 — Reminder, sent only to departments that have not yet submitted. */
export function newsletterReminderEmail(p: {
  ministryName: string;
  monthLabel: string;
  submitUrl: string;
  deadline?: string;
}): Rendered {
  return {
    subject: `Reminder: ${p.monthLabel} newsletter content from ${p.ministryName}`,
    html:
      `<p>Hello ${esc(p.ministryName)} team,</p>` +
      `<p>Just a friendly reminder that we haven't yet received your update for the <strong>${esc(p.monthLabel)}</strong> ` +
      `McKinney SDA newsletter. If your ministry has something to share, there's still time.</p>` +
      (p.deadline ? `<p><strong>Deadline:</strong> ${esc(p.deadline)}.</p>` : "") +
      `<p>${btn(p.submitUrl, "Submit Newsletter Content", true)}</p>` +
      `<p style="font-size:12px;color:${SLATE}">If you have nothing to share this month, no action is needed.</p>`,
  };
}

/** §12/§29 — Review decision sent to the submitting department head. */
export function newsletterSubmissionDecisionEmail(p: {
  title: string;
  ministryName: string;
  decision: "approved" | "changes_requested" | "declined";
  note?: string;
  url: string;
}): Rendered {
  const t = `<strong>${esc(p.title)}</strong>`;
  const lead: Record<typeof p.decision, { subject: string; body: string }> = {
    approved: {
      subject: `Approved for the newsletter: ${p.title}`,
      body: `<p>Your submission ${t} has been <strong>approved</strong> for the upcoming McKinney SDA newsletter. Thank you!</p>`,
    },
    changes_requested: {
      subject: `Changes requested: ${p.title}`,
      body: `<p>Our Communications team has requested some changes to your newsletter submission ${t} before it can be included.</p>`,
    },
    declined: {
      subject: `Not included this month: ${p.title}`,
      body: `<p>Your newsletter submission ${t} won't be included in this month's issue.</p>`,
    },
  };
  const { subject, body } = lead[p.decision];
  return {
    subject,
    html:
      body +
      (p.note ? `<p><strong>Note from the reviewer:</strong> ${esc(p.note)}</p>` : "") +
      (p.decision === "changes_requested" ? `<p>${btn(p.url, "Update your submission", true)}</p>` : `<p>${btn(p.url, "Open your dashboard")}</p>`) +
      `<p style="font-size:12px;color:${SLATE}">${esc(p.ministryName)}</p>`,
  };
}

/* ---------- Member-facing edition (§22) ---------- */

export type EditionSectionItem = {
  title?: string;
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  meta?: string; // e.g. an event date/time line
};

export type EditionSection = {
  heading: string;
  intro?: string;
  items: EditionSectionItem[];
};

export type StayConnectedLink = { label: string; url: string };

/**
 * §22 — The member newsletter edition, rendered for email clients. Kept intentionally lean: a
 * branded cover, the pastor's message, a handful of content blocks, "coming up", explicit
 * Stay-Connected links, a prominent "View in browser" link (the web edition is canonical), and a
 * one-click unsubscribe footer. Images always carry alt text and never carry meaning that the copy
 * doesn't also convey, so a client with images disabled still reads correctly.
 */
export function newsletterEditionEmail(p: {
  monthLabel: string;
  coverHeadline?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  pastorMessage?: string;
  pastorMessageBy?: string;
  sections: EditionSection[];
  stayConnected: StayConnectedLink[];
  webUrl: string;
  unsubscribeUrl: string;
}): Rendered {
  const cover =
    p.coverImageUrl
      ? `<img src="${esc(p.coverImageUrl)}" alt="${esc(p.coverImageAlt || p.coverHeadline || `${p.monthLabel} newsletter cover`)}" ` +
        `width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:0" />`
      : "";

  const pastor = p.pastorMessage
    ? `<div style="padding:8px 24px 0">` +
      `<p style="margin:20px 0 6px;font-weight:700;color:${NAVY};font-size:16px">From Our Pastor</p>` +
      `<p style="margin:0 0 4px;color:${INK};line-height:1.6">${esc(p.pastorMessage)}</p>` +
      (p.pastorMessageBy ? `<p style="margin:6px 0 0;color:${SLATE};font-style:italic">— ${esc(p.pastorMessageBy)}</p>` : "") +
      `</div>`
    : "";

  const renderItem = (it: EditionSectionItem): string =>
    `<div style="margin:0 0 16px">` +
    (it.imageUrl
      ? `<img src="${esc(it.imageUrl)}" alt="${esc(it.imageAlt || it.title || "")}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:8px;margin:0 0 8px" />`
      : "") +
    (it.title ? `<p style="margin:0 0 2px;font-weight:600;color:${NAVY};font-size:16px">${esc(it.title)}</p>` : "") +
    (it.meta ? `<p style="margin:0 0 4px;color:${SLATE};font-size:13px">${esc(it.meta)}</p>` : "") +
    (it.text ? `<p style="margin:0 0 6px;color:${INK};line-height:1.6">${esc(it.text)}</p>` : "") +
    (it.ctaLabel && it.ctaUrl ? `<p style="margin:4px 0 0">${btn(it.ctaUrl, it.ctaLabel)}</p>` : "") +
    `</div>`;

  const sections = p.sections
    .filter((s) => s.items.length > 0)
    .map(
      (s) =>
        `<div style="padding:0 24px;border-top:1px solid ${LINE};margin-top:8px;padding-top:16px">` +
        `<p style="margin:0 0 8px;font-weight:700;color:${NAVY};font-size:18px">${esc(s.heading)}</p>` +
        (s.intro ? `<p style="margin:0 0 12px;color:${SLATE};line-height:1.6">${esc(s.intro)}</p>` : "") +
        s.items.map(renderItem).join("") +
        `</div>`,
    )
    .join("");

  const stay = p.stayConnected.length
    ? `<div style="padding:16px 24px;border-top:1px solid ${LINE};margin-top:8px">` +
      `<p style="margin:0 0 8px;font-weight:700;color:${NAVY}">Stay Connected</p>` +
      `<p style="margin:0">${p.stayConnected.map((l) => btn(l.url, l.label)).join("")}</p>` +
      `</div>`
    : "";

  return {
    subject: `The McKinney SDA Newsletter — ${esc(p.monthLabel)}`,
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:${INK};background:#ffffff">` +
      `<div style="text-align:center;padding:6px 0"><a href="${esc(p.webUrl)}" style="font-size:12px;color:${SLATE}">View this newsletter in your browser</a></div>` +
      `<div style="background:${NAVY};color:#fff;padding:24px">` +
      `<p style="margin:0;font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">McKinney SDA Church · Monthly Newsletter</p>` +
      `<h1 style="margin:6px 0 0;font-size:24px">${esc(p.monthLabel)}</h1>` +
      (p.coverHeadline ? `<p style="margin:8px 0 0;opacity:.92;font-size:16px">${esc(p.coverHeadline)}</p>` : "") +
      `</div>` +
      cover +
      pastor +
      sections +
      stay +
      `<div style="padding:20px 24px 28px">` +
      `<p style="margin:0 0 12px">${btn(p.webUrl, "Read the full newsletter online", true)}</p>` +
      `<p style="margin:0;font-size:12px;color:#7a909c">You're receiving this because you're part of the McKinney SDA Church family. ` +
      `<a href="${esc(p.unsubscribeUrl)}" style="color:#7a909c">Manage your email preferences or unsubscribe</a>.</p>` +
      `</div></div>`,
  };
}
