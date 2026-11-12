import { z } from "zod";
import { email } from "../../lib/validators.js";
import { INQUIRY_STATUSES, INQUIRY_TYPES } from "./inquiries.model.js";

const opt = (max: number) => z.string().trim().max(max).optional();

/** Public contact / support submission. Select fields are checked against backend-managed options in the service. */
export const publicInquirySchema = z.object({
  inquiry_type: z.enum(INQUIRY_TYPES),
  full_name: z.string().trim().min(2, "Enter your full name.").max(150),
  email,
  company: opt(150),
  phone_country_code: z
    .string()
    .trim()
    .max(8)
    .refine((v) => v === "" || /^\+\d{1,4}$/.test(v), "Use a country code like +880 or +1.")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || /^[0-9 ()-]{5,20}$/.test(v), "Use digits only (spaces and dashes are fine).")
    .optional(),
  topic: opt(60),
  service: opt(160),
  industry: opt(120),
  product_type: opt(120),
  project: opt(220),
  budget: opt(60),
  timeline: opt(60),
  contact_method: opt(60),
  subject: opt(200),
  support_category: opt(60),
  project_reference_text: opt(200),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(5000),
  privacy_acknowledged: z.literal(true, { message: "Please confirm you have read the privacy notice." }),
  source_page: opt(255),
  /** Honeypot: real visitors never fill this in. */
  hp_website: opt(200),
});

export const updateInquirySchema = z.object({
  assigned_to: z.preprocess((v) => (v === "" ? null : v), z.string().length(24).nullable()).optional(),
  is_read: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export const noteSchema = z.object({ note: z.string().trim().min(1, "This field is required.").max(5000, "Max 5000 characters.") });

export const statusSchema = z.object({
  status: z.enum(INQUIRY_STATUSES, { message: `Choose one of ${JSON.stringify(INQUIRY_STATUSES)}.` }),
  comment: z.string().trim().max(1000).optional(),
});
