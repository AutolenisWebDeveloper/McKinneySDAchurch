"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/auth/reset";
import { sendEmail } from "@/lib/email";
import { env } from "@/env";

/** Always responds generically — never reveals whether an account exists. */
export async function requestReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    const res = await requestPasswordReset(email);
    if (res) {
      const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
      const link = `${base}/auth/reset/${res.rawToken}`;
      await sendEmail({
        to: email,
        subject: "Reset your McKinney SDA Church password",
        type: "TRANSACTIONAL",
        html: `<p>We received a request to reset your password.</p>
<p><a href="${link}">Reset your password</a> — this link expires in one hour.</p>
<p>If you didn’t request this, you can safely ignore this email.</p>`,
      });
    }
  }
  redirect("/auth/forgot?sent=1");
}
