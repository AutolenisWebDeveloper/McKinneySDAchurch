"use server";
import { redirect } from "next/navigation";
import { memberConfirmTransfer, memberDenyTransfer } from "@/lib/membership-transfers";

export async function confirmByToken(formData: FormData) {
  const token = String(formData.get("token"));
  const decision = String(formData.get("decision"));
  if (!token) redirect("/transfer");
  if (decision === "confirm") await memberConfirmTransfer({ rawToken: token });
  else await memberDenyTransfer({ rawToken: token });
  redirect(`/transfer/confirm/${encodeURIComponent(token)}?done=${decision === "confirm" ? "confirmed" : "declined"}`);
}
