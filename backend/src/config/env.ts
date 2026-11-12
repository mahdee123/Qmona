import dotenv from "dotenv";
import { z } from "zod";

// In Docker the variables come from the container environment; locally from backend/.env.
dotenv.config({ quiet: true });

const csv = z
  .string()
  .default("")
  .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean));

const flag = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === "true" || v === "1"));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().optional(),
  MONGODB_TEST_URI: z.string().optional(),

  CORS_ALLOWED_ORIGINS: csv,
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  REVALIDATE_SECRET: z.string().default(""),
  REVALIDATION_ENABLED: flag(false),

  UPLOAD_DIR: z.string().default("./data/uploads"),
  MEDIA_PUBLIC_BASE_URL: z.string().default(""),
  MEDIA_MAX_UPLOAD_MB: z.coerce.number().positive().default(10),

  SESSION_TTL_HOURS: z.coerce.number().positive().default(10),
  COOKIE_SECURE: flag(false),
  // Number of reverse-proxy hops that append to X-Forwarded-For in front of the API.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  EMAIL_FROM: z.string().default("Qmona Website <no-reply@localhost>"),
  INQUIRY_NOTIFICATION_EMAILS: csv,

  THROTTLE_ANON_PER_MIN: z.coerce.number().int().positive().default(300),
  THROTTLE_LOGIN: z.coerce.number().int().positive().default(10),
  THROTTLE_INQUIRY: z.coerce.number().int().positive().default(10),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Print variable names only, never values.
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
    throw new Error(`Invalid environment configuration:\n  ${problems}`);
  }
  const e = parsed.data;
  const isTestEnv = e.NODE_ENV === "test";
  const mongoUri = isTestEnv ? e.MONGODB_TEST_URI : e.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(`${isTestEnv ? "MONGODB_TEST_URI" : "MONGODB_URI"} is required.`);
  }
  if (isTestEnv && !/\/[^/?]*_test(\?|$)/.test(mongoUri)) {
    // Tests wipe collections; refuse to run against anything that is not clearly a test database.
    throw new Error("MONGODB_TEST_URI must point to a database whose name ends with _test.");
  }
  if (e.NODE_ENV === "production") {
    if (!e.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true in production.");
    if (e.REVALIDATION_ENABLED && e.REVALIDATE_SECRET.length < 16) {
      throw new Error("REVALIDATE_SECRET must be at least 16 characters when revalidation is enabled.");
    }
    if (!e.MEDIA_PUBLIC_BASE_URL) throw new Error("MEDIA_PUBLIC_BASE_URL is required in production.");
  }
  return { ...e, MONGODB_URI: mongoUri };
}

export const env = load();
export type Env = typeof env;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
