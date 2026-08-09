/**
 * Resolve a data-read promise, degrading to a fallback if it rejects.
 *
 * Public pages read from the database on every request. A transient database
 * problem must never take a whole page down to the error boundary — the page
 * should still render its (mostly static) content with empty states. Wrap each
 * public read in `safe(...)` with a sensible fallback (`[]`, `null`, `0`, …).
 *
 * This is intentionally scoped to the public front-end. Do NOT use it in the
 * dashboard/admin data paths, where a failed read must surface, not be hidden.
 */
export async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
