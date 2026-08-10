/**
 * Safe email template rendering (§39). Templates are plain text with `{{variable}}` placeholders —
 * NEVER code. Substitution is the only operation; there is no expression evaluation. Values are
 * HTML-escaped when rendered into the subject/HTML body, and inserted raw into the plain-text body.
 * Unknown placeholders render as empty so a missing variable never leaks `{{…}}` to a recipient.
 */

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** The distinct variable names referenced by a template body. */
export function extractVariables(...bodies: (string | null | undefined)[]): string[] {
  const found = new Set<string>();
  for (const body of bodies) {
    if (!body) continue;
    for (const m of body.matchAll(PLACEHOLDER)) found.add(m[1]!);
  }
  return [...found];
}

function substitute(body: string, vars: Record<string, string | number | null | undefined>, escape: boolean): string {
  return body.replace(PLACEHOLDER, (_full, name: string) => {
    const v = vars[name];
    if (v === undefined || v === null) return "";
    const s = String(v);
    return escape ? escapeHtml(s) : s;
  });
}

export type RenderedTemplate = { subject: string; html: string; text: string };

/** Render a template's subject/html/text with the given variables. */
export function renderTemplate(
  tpl: { subject: string; htmlBody: string; textBody?: string | null },
  vars: Record<string, string | number | null | undefined> = {},
): RenderedTemplate {
  const subject = substitute(tpl.subject, vars, true);
  const html = substitute(tpl.htmlBody, vars, true);
  const text = tpl.textBody
    ? substitute(tpl.textBody, vars, false)
    : stripHtml(substitute(tpl.htmlBody, vars, false));
  return { subject, html, text };
}

/** Very small HTML→text fallback for a plain-text body when none is provided. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|li|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
