/**
 * Print stylesheet for the bi-fold bulletin (§15). On screen the two 11×17 sheets are shown as a
 * scrollable preview; in print they impose to Tabloid landscape with the site chrome hidden. Two
 * 8.5×11 panels per sheet → four panels when folded. Colors print exactly (print-color-adjust).
 */
export const PRINT_CSS = `
.bp-root { --navy: #003B5C; --ink: #132a3a; --muted: #53636e; --line: #d6e1e7; }
.bp-root { display: flex; flex-direction: column; align-items: center; gap: 20px; font-family: "Noto Sans", Arial, sans-serif; color: var(--ink); }
.bp-sheet {
  display: flex; width: 17in; min-height: 10.6in; background: #fff;
  box-shadow: 0 6px 28px rgba(0,59,92,.14); border: 1px solid var(--line);
}
.bp-panel { width: 8.5in; box-sizing: border-box; padding: 0.5in; display: flex; flex-direction: column; }
.bp-panel + .bp-panel { border-left: 1px dashed var(--line); }
.bp-kicker { font-family: "Noto Serif", Georgia, serif; font-size: 15pt; font-weight: 700; color: var(--navy); margin: 0 0 10px; letter-spacing: .01em; }
.bp-kicker-2 { margin-top: 18px; }
.bp-muted { color: var(--muted); }

/* Cover */
.bp-cover { justify-content: space-between; }
.bp-cover-top { text-align: center; background: var(--navy); color: #fff; margin: -0.5in -0.5in 0; padding: 0.5in 0.4in 0.35in; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.bp-cover-kicker { text-transform: uppercase; letter-spacing: .22em; font-size: 8pt; opacity: .85; margin: 0; }
.bp-cover-title { font-family: "Noto Serif", Georgia, serif; font-size: 38pt; margin: 4px 0 0; font-weight: 700; }
.bp-cover-date { margin: 10px 0 0; font-size: 11pt; opacity: .92; }
.bp-rule { width: 46px; height: 3px; background: #f2b441; border-radius: 3px; margin: 12px auto 0; }
.bp-cover-mid { text-align: center; padding: 6px 4px; }
.bp-welcome { font-family: "Noto Serif", Georgia, serif; font-size: 20pt; color: var(--navy); margin: 0; }
.bp-theme { font-style: italic; color: var(--muted); margin: 4px 0 0; }
.bp-sermon { margin-top: 22px; }
.bp-sermon-label { text-transform: uppercase; letter-spacing: .16em; font-size: 8pt; color: var(--muted); margin: 0; }
.bp-sermon-title { font-family: "Noto Serif", Georgia, serif; font-size: 16pt; color: var(--ink); margin: 4px 0 2px; }
.bp-sermon-meta { font-size: 10pt; color: var(--muted); margin: 0; }
.bp-cover-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; border-top: 1px solid var(--line); padding-top: 12px; }
.bp-service p { margin: 2px 0; font-size: 10pt; }
.bp-cover-qr { text-align: center; font-size: 8pt; color: var(--muted); }

/* QR */
.bp-qr { width: 84px; height: 84px; }
.bp-qr svg { width: 100%; height: 100%; display: block; }
.bp-cover-qr .bp-qr { width: 96px; height: 96px; margin: 0 auto 2px; }

/* Announcements */
.bp-ann-cat { margin-bottom: 12px; }
.bp-ann-cat-title { text-transform: uppercase; letter-spacing: .12em; font-size: 8.5pt; color: var(--navy); border-bottom: 1px solid var(--line); padding-bottom: 3px; margin: 0 0 6px; }
.bp-ann { display: flex; gap: 10px; align-items: flex-start; padding: 5px 0; border-bottom: 1px solid #eef3f6; break-inside: avoid; }
.bp-ann:last-child { border-bottom: 0; }
.bp-ann-body { flex: 1; }
.bp-ann-title { font-weight: 700; font-size: 10.5pt; margin: 0; color: var(--ink); }
.bp-ann-summary { font-size: 9.5pt; margin: 2px 0 0; color: #2b3f4c; line-height: 1.35; }
.bp-ann-meta { font-size: 8.5pt; color: var(--muted); margin: 2px 0 0; }
.bp-ann-qr { text-align: center; font-size: 6.5pt; color: var(--muted); width: 54px; flex-shrink: 0; }
.bp-ann-qr .bp-qr { width: 48px; height: 48px; margin: 0 auto; }

/* Worship */
.bp-ss p { margin: 2px 0; font-size: 10pt; }
.bp-order { list-style: none; counter-reset: o; margin: 6px 0 0; padding: 0; }
.bp-order li { display: flex; justify-content: space-between; gap: 10px; padding: 3.5px 0; border-bottom: 1px solid #eef3f6; break-inside: avoid; }
.bp-order-title { font-size: 10pt; }
.bp-order-detail { color: var(--muted); }
.bp-order-part { font-size: 9pt; color: var(--muted); flex-shrink: 0; }
.bp-duty, .bp-next { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 8px; }
.bp-duty p, .bp-next p { margin: 2px 0; font-size: 9.5pt; }
.bp-next-title { font-family: "Noto Serif", Georgia, serif; color: var(--navy); font-weight: 700; }

/* Back / connect */
.bp-back { justify-content: flex-start; }
.bp-connect { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.bp-connect-item { text-align: center; font-size: 8.5pt; }
.bp-connect-label { display: block; margin-top: 3px; color: var(--muted); }
.bp-inspiration { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 10px 0; margin-bottom: 14px; text-align: center; }
.bp-inspiration-label { text-transform: uppercase; letter-spacing: .16em; font-size: 8pt; color: var(--muted); margin: 0; }
.bp-inspiration-text { font-family: "Noto Serif", Georgia, serif; font-style: italic; color: var(--ink); margin: 4px 0 0; }
.bp-contact { font-size: 9.5pt; color: var(--ink); margin-top: auto; }
.bp-contact-name { font-weight: 700; color: var(--navy); margin: 0 0 2px; }
.bp-contact p { margin: 1px 0; }

/* Screen preview: allow horizontal scroll for the wide sheets */
@media screen {
  .bp-root { overflow-x: auto; padding: 0 12px 24px; }
}

@media print {
  header, footer, .bp-toolbar, [data-cookie-notice], nav { display: none !important; }
  main { padding: 0 !important; }
  html, body { background: #fff !important; }
  .bp-root { gap: 0; }
  .bp-sheet { box-shadow: none; border: 0; page-break-after: always; break-after: page; min-height: 10.5in; }
  .bp-sheet:last-child { page-break-after: auto; }
  @page { size: 17in 11in; margin: 0.25in; }
}
`;
