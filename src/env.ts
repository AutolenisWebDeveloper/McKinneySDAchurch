import { z } from "zod";

/** Fail fast at boot if required configuration is missing. */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  // Accept a bare host (e.g. Vercel's "my-app.vercel.app") and normalize to https://.
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (v) => (typeof v === "string" && v && !/^https?:\/\//.test(v) ? `https://${v}` : v),
    z.string().url(),
  ),
  NEXTAUTH_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(32),
  TOKEN_HMAC_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  MAIL_FROM: z.string().default("McKinney SDA <noreply@mckinneysda.org>"),
  ADVENTIST_GIVING_URL: z.string().url().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Optional: URL of an externally hosted Building Project cinematic film. When set,
  // it overrides the local /public/video file. Leave unset to use the local file
  // (or the poster rendering until the film is added).
  BUILDING_CINEMATIC_URL: z.string().url().optional(),
});

export const env = schema.parse(process.env);
