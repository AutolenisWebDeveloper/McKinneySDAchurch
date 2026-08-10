"use server";

import { redirect } from "next/navigation";
import { submitAccountRequest } from "@/lib/account-requests";

/**
 * Public "Request a Member Account" (§20). Creates an AccountRequest and runs membership
 * matching — a single confident match to an eligible member is auto-approved; otherwise it
 * goes to the admin exception queue. No login is created here. Responses are always generic
 * (no account enumeration).
 */
export async function registerMember(formData: FormData) {
  // Honeypot: silently accept + drop bots.
  if (String(formData.get("website") ?? "")) redirect("/auth/register?done=1");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const verificationData = String(formData.get("verification") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!firstName || !lastName) redirect("/auth/register?error=name");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/auth/register?error=invalid");
  if (password.length < 8) redirect("/auth/register?error=short");
  if (password !== confirm) redirect("/auth/register?error=match");

  await submitAccountRequest({ firstName, lastName, email, phone, verificationData, password });

  // Generic success regardless of match/auto/pending (no enumeration).
  redirect("/auth/register?done=1");
}
