"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import {
  memberInfoSchema,
  encodeMemberInfo,
  pickContactEmail,
  blankToUndef,
  type Adult,
} from "@/lib/member-info";

function adultFromForm(fd: FormData, p: string): Adult {
  const employment = {
    occupation: blankToUndef(fd.get(`${p}_occupation`)),
    employer: blankToUndef(fd.get(`${p}_employer`)),
    status: blankToUndef(fd.get(`${p}_empStatus`)),
    skills: blankToUndef(fd.get(`${p}_skills`)),
  };
  const hasEmployment = Object.values(employment).some(Boolean);
  return {
    fullName: blankToUndef(fd.get(`${p}_fullName`)),
    phone: blankToUndef(fd.get(`${p}_phone`)),
    email: blankToUndef(fd.get(`${p}_email`)),
    baptismYear: blankToUndef(fd.get(`${p}_baptismYear`)),
    joinedYear: blankToUndef(fd.get(`${p}_joinedYear`)),
    ministriesCurrent: blankToUndef(fd.get(`${p}_current`)),
    ministriesInterested: blankToUndef(fd.get(`${p}_interested`)),
    // Cast is safe: an invalid select value fails schema validation below.
    employment: hasEmployment ? (employment as Adult["employment"]) : undefined,
  };
}

export async function submitMemberInfo(formData: FormData) {
  // Anti-spam honeypot (matches the site-wide hidden "website" field).
  if (String(formData.get("website") ?? "").length > 0) redirect("/member-info?thanks=1");

  if (formData.get("consent") !== "on") redirect("/member-info?error=consent");

  // Children arrive as parallel arrays (one entry per rendered row); zip + drop empties.
  const names = formData.getAll("childFullName").map(String);
  const dobs = formData.getAll("childBirthDate").map(String);
  const baps = formData.getAll("childBaptismYear").map(String);
  const joins = formData.getAll("childJoinedYear").map(String);
  const children = names
    .map((n, i) => ({
      fullName: n.trim(),
      birthDate: (dobs[i] ?? "").trim() || undefined,
      baptismYear: (baps[i] ?? "").trim() || undefined,
      joinedYear: (joins[i] ?? "").trim() || undefined,
    }))
    .filter((c) => c.fullName.length > 0);

  const parsed = memberInfoSchema.safeParse({
    householdName: blankToUndef(formData.get("householdName")),
    address: blankToUndef(formData.get("address")),
    anniversary: blankToUndef(formData.get("anniversary")),
    husband: adultFromForm(formData, "husband"),
    wife: adultFromForm(formData, "wife"),
    children,
    consent: true,
  });
  if (!parsed.success) redirect("/member-info?error=1");

  // If opened from an emailed invite, tie the submission back to that invite's address.
  let invitedEmail: string | null = null;
  const inviteToken = blankToUndef(formData.get("invite"));
  if (inviteToken) {
    const invite = await prisma.memberInfoInvite.findUnique({
      where: { tokenDigest: sha256(inviteToken) },
      select: { email: true },
    });
    invitedEmail = invite?.email ?? null;
  }

  const payload = parsed.data;
  await prisma.memberInfoSubmission.create({
    data: {
      householdName: payload.householdName,
      contactEmail: pickContactEmail(payload) ?? invitedEmail ?? undefined,
      invitedEmail,
      consent: true,
      status: "NEW",
      payloadEnc: encodeMemberInfo(payload),
    },
  });

  redirect("/member-info?thanks=1");
}
