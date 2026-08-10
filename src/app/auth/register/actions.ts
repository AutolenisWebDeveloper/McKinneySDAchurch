"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";

/**
 * Open member self-registration. Creates a MEMBER account in a *pending* state
 * (activatedAt = null); an admin must approve it before it can sign in.
 * Responses are generic so the form never reveals whether an email already exists.
 */
export async function registerMember(formData: FormData) {
  // Honeypot: silently accept + drop bots.
  if (String(formData.get("website") ?? "")) redirect("/auth/register?done=1");

  const name = String(formData.get("name") ?? "").trim() || undefined;
  const email = String(formData.get("email") ?? "").trim();
  const emailNormalized = email.toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/auth/register?error=invalid");
  if (password.length < 8) redirect("/auth/register?error=short");
  if (password !== confirm) redirect("/auth/register?error=match");

  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (!existing) {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { name, email, emailNormalized, passwordHash, role: "MEMBER", activatedAt: null },
    });
  }
  // Generic success either way (no account enumeration).
  redirect("/auth/register?done=1");
}
