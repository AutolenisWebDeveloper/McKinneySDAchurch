"use server";

import { redirect } from "next/navigation";
import { resetPassword } from "@/auth/reset";

export async function doReset(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) redirect(`/auth/reset/${token}?error=short`);
  if (password !== confirm) redirect(`/auth/reset/${token}?error=match`);

  try {
    await resetPassword(token, password);
  } catch {
    redirect(`/auth/reset/${token}?error=invalid`);
  }
  redirect("/auth/login?reset=1");
}
