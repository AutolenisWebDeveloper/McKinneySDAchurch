"use server";

import { redirect } from "next/navigation";
import { acceptInvite } from "@/auth/invite";

export async function doAccept(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || undefined;
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) redirect(`/auth/invite/${token}?error=short`);
  if (password !== confirm) redirect(`/auth/invite/${token}?error=match`);

  try {
    await acceptInvite({ rawToken: token, email, password, name });
  } catch {
    redirect(`/auth/invite/${token}?error=invalid`);
  }
  redirect("/auth/login?welcome=1");
}
