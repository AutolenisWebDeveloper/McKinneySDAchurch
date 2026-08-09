import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailStatus } from "@prisma/client";

/** Verify a Resend (Svix) webhook signature. secret is `whsec_<base64>`. */
export function verifyResendSignature(
  body: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string
): boolean {
  const b64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(b64, "base64");
  const signedContent = `${headers.id}.${headers.timestamp}.${body}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");
  // header is space-separated `v1,<sig>` tokens
  for (const part of headers.signature.split(" ")) {
    const sig = part.includes(",") ? part.split(",")[1]! : part;
    const a = Buffer.from(sig), e = Buffer.from(expected);
    if (a.length === e.length && timingSafeEqual(a, e)) return true;
  }
  return false;
}

/** Map a Resend event type to a status update and (optionally) a hard suppression. */
export function mapResendEvent(type: string): { status: EmailStatus; suppress?: "GLOBAL" } | null {
  switch (type) {
    case "email.sent": return { status: "ACCEPTED" };
    case "email.delivered": return { status: "DELIVERED" };
    case "email.delivery_delayed": return { status: "DELAYED" };
    case "email.bounced": return { status: "BOUNCED", suppress: "GLOBAL" };
    case "email.complained": return { status: "COMPLAINED", suppress: "GLOBAL" };
    default: return null; // opened/clicked/etc. — ignore
  }
}
