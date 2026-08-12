import { z } from "zod";
import { encryptField, decryptField } from "@/lib/crypto";

/**
 * Schema, types, and secure encode/decode for the public "Member Information Form".
 *
 * The whole submission is sensitive household PII (home address, spouses' contact
 * details, children with birth dates, employment). It is serialized to JSON and
 * app-encrypted (AES-256-GCM via `crypto.ts`) before it touches the database, and
 * only decrypted for authorized staff in the admin review inbox.
 */

export const EMPLOYMENT_STATUSES = ["EMPLOYED", "SELF_EMPLOYED", "RETIRED", "STUDENT", "UNEMPLOYED"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_STATUS_LABEL: Record<EmploymentStatus, string> = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self-employed",
  RETIRED: "Retired",
  STUDENT: "Student",
  UNEMPLOYED: "Unemployed",
};

const shortText = z.string().trim().max(200).optional();
const longText = z.string().trim().max(2000).optional();
const year = z.string().trim().max(4).optional();

/** Optional employment block for an adult — every field optional per spec. */
export const employmentSchema = z
  .object({
    occupation: shortText,
    employer: shortText,
    status: z.enum(EMPLOYMENT_STATUSES).optional(),
    skills: longText,
  })
  .partial()
  .optional();

/** An adult (husband/wife). All fields optional so single-adult households work. */
export const adultSchema = z.object({
  fullName: z.string().trim().max(160).optional(),
  birthDate: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(200).optional(),
  baptismYear: year,
  joinedYear: year,
  ministriesCurrent: longText,
  ministriesInterested: longText,
  employment: employmentSchema,
});
export type Adult = z.infer<typeof adultSchema>;

export const childSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  birthDate: z.string().trim().max(40).optional(),
  baptismYear: year,
  joinedYear: year,
});
export type Child = z.infer<typeof childSchema>;

export const memberInfoSchema = z.object({
  householdName: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  anniversary: z.string().trim().max(40).optional(),
  husband: adultSchema,
  wife: adultSchema,
  children: z.array(childSchema).max(25),
  consent: z.literal(true),
});
export type MemberInfoPayload = z.infer<typeof memberInfoSchema>;

/** Serialize + encrypt a validated payload for storage in `payloadEnc`. */
export function encodeMemberInfo(payload: MemberInfoPayload): string {
  return encryptField(JSON.stringify(payload));
}

/** Decrypt + parse a stored payload for the admin review view. */
export function decodeMemberInfo(payloadEnc: string): MemberInfoPayload {
  return JSON.parse(decryptField(payloadEnc)) as MemberInfoPayload;
}

/** Turn "" into undefined so blank optional inputs don't fail validation. */
export function blankToUndef(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
}

/** A best-effort contact email kept in clear (for the inbox), preferring the husband's. */
export function pickContactEmail(payload: MemberInfoPayload): string | undefined {
  return payload.husband?.email || payload.wife?.email || undefined;
}
