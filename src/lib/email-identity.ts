/** Canonical email identity. Lowercase + trim (safe, standard normalization). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
