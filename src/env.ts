import { z } from "zod";

/** Fail fast at boot if required configuration is missing. */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(32),
  TOKEN_HMAC_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  MAIL_FROM: z.string().default("McKinney SDA <noreply@mckinneysda.org>"),
  ADVENTIST_GIVING_URL: z.string().url().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export const env = schema.parse(process.env);
