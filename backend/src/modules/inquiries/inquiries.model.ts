import { createHash, randomBytes } from "node:crypto";
import { Schema, model, type Types } from "mongoose";
import { ref, timestamps } from "../../lib/schema.js";

export const INQUIRY_TYPES = ["contact", "support"] as const;
export const INQUIRY_STATUSES = ["new", "reviewing", "contacted", "qualified", "closed", "spam"] as const;
export const OPEN_STATUSES = ["new", "reviewing", "contacted", "qualified"] as const;
export const NOTIFICATION_STATUSES = ["pending", "sent", "failed", "skipped"] as const;

export interface InquiryAttrs {
  reference: string;
  inquiry_type: (typeof INQUIRY_TYPES)[number];
  full_name: string;
  email: string;
  phone_country_code: string;
  phone: string;
  company: string;
  topic: string;
  subject: string;
  support_category: string;
  service: Types.ObjectId | null;
  industry: Types.ObjectId | null;
  product_type: Types.ObjectId | null;
  project_reference: Types.ObjectId | null;
  project_reference_text: string;
  estimated_budget: string;
  estimated_timeline: string;
  preferred_contact_method: string;
  submitted_choices: Record<string, unknown>;
  message: string;
  privacy_acknowledged: boolean;
  source_page: string;
  is_read: boolean;
  is_archived: boolean;
  archived_at: Date | null;
  assigned_to: Types.ObjectId | null;
  status: (typeof INQUIRY_STATUSES)[number];
  notification_status: (typeof NOTIFICATION_STATUSES)[number];
  notification_error: string;
  notification_attempts: number;
  notification_last_attempt_at: Date | null;
  notification_sent_at: Date | null;
  submission_hash: string;
  ip_address: string;
  user_agent: string;
  notes: { _id: Types.ObjectId; author: Types.ObjectId | null; note: string; created_at: Date }[];
  status_history: { _id: Types.ObjectId; from_status: string; to_status: string; changed_by: Types.ObjectId | null; comment: string; created_at: Date }[];
  created_at: Date;
  updated_at: Date;
}

const inquirySchema = new Schema<InquiryAttrs>(
  {
    reference: { type: String, unique: true, index: true },
    inquiry_type: { type: String, enum: INQUIRY_TYPES, default: "contact", index: true },
    full_name: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, required: true, trim: true, maxlength: 254, index: true },
    phone_country_code: { type: String, default: "", maxlength: 8 },
    phone: { type: String, default: "", maxlength: 50 },
    company: { type: String, default: "", maxlength: 150 },
    topic: { type: String, default: "", maxlength: 200 },
    subject: { type: String, default: "", maxlength: 200 },
    support_category: { type: String, default: "", maxlength: 120 },
    service: ref("Service"),
    industry: ref("Industry"),
    product_type: ref("ProductType"),
    project_reference: ref("Project"),
    project_reference_text: { type: String, default: "", maxlength: 200 },
    estimated_budget: { type: String, default: "", maxlength: 100 },
    estimated_timeline: { type: String, default: "", maxlength: 100 },
    preferred_contact_method: { type: String, default: "", maxlength: 50 },
    submitted_choices: { type: Schema.Types.Mixed, default: {} },
    message: { type: String, required: true },
    privacy_acknowledged: { type: Boolean, default: false },
    source_page: { type: String, default: "/contact", maxlength: 255 },
    is_read: { type: Boolean, default: false, index: true },
    is_archived: { type: Boolean, default: false, index: true },
    archived_at: { type: Date, default: null },
    assigned_to: ref("User"),
    status: { type: String, enum: INQUIRY_STATUSES, default: "new", index: true },
    notification_status: { type: String, enum: NOTIFICATION_STATUSES, default: "pending", index: true },
    notification_error: { type: String, default: "" },
    notification_attempts: { type: Number, default: 0 },
    notification_last_attempt_at: { type: Date, default: null },
    notification_sent_at: { type: Date, default: null },
    submission_hash: { type: String, default: "", index: true },
    ip_address: { type: String, default: "" },
    user_agent: { type: String, default: "" },
    notes: {
      type: [
        new Schema(
          { author: ref("User"), note: { type: String, required: true }, created_at: { type: Date, default: Date.now } },
          { _id: true },
        ),
      ],
      default: [],
    },
    status_history: {
      type: [
        new Schema(
          {
            from_status: String,
            to_status: String,
            changed_by: ref("User"),
            comment: { type: String, default: "" },
            created_at: { type: Date, default: Date.now },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
  },
  timestamps,
);
inquirySchema.index({ status: 1, created_at: -1 });
inquirySchema.index({ inquiry_type: 1, is_archived: 1, created_at: -1 });

inquirySchema.pre("validate", function () {
  // A short human-friendly reference the visitor can quote when they contact us again.
  if (!this.reference) this.reference = `QM-${randomBytes(3).toString("hex").toUpperCase()}`;
});

export const Inquiry = model<InquiryAttrs>("Inquiry", inquirySchema);

/** Same visitor + same message within the duplicate window is treated as one submission. */
export function submissionHash(type: string, email: string, message: string): string {
  const normalized = message.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  return createHash("sha256").update(`${type}|${email.trim().toLowerCase()}|${normalized}`).digest("hex");
}
