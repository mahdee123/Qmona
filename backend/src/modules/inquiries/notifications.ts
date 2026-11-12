import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import type { Doc } from "../../lib/serialize.js";
import { Inquiry } from "./inquiries.model.js";

/**
 * Agency notification for new inquiries.
 * Called only AFTER the inquiry is saved. Any failure is recorded on the inquiry (status, attempts, error) and
 * never propagates, so a broken mail provider can never lose a submission. Staff can retry from the admin portal.
 */
let transport: Pick<Transporter, "sendMail"> | null = null;

/** Tests inject a fake transport so no real email is sent. */
export function setMailTransport(t: Pick<Transporter, "sendMail"> | null) {
  transport = t;
}

function getTransport(): Pick<Transporter, "sendMail"> | null {
  if (transport) return transport;
  if (!env.SMTP_HOST) return null;
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

const TYPE_LABEL = { contact: "Project inquiry", support: "Support request" } as const;

export function buildBody(i: Doc): string {
  const rows: [string, string][] = [
    ["Reference", i.reference],
    ["Type", TYPE_LABEL[i.inquiry_type as keyof typeof TYPE_LABEL]],
    ["Name", i.full_name],
    ["Email", i.email],
    ["Company", i.company],
    ["Phone", `${i.phone_country_code} ${i.phone}`.trim()],
    ["Topic", i.topic],
    ["Subject", i.subject],
    ["Issue category", i.support_category],
    ["Service", i.service?.title ?? ""],
    ["Industry", i.industry?.name ?? ""],
    ["Product type", i.product_type?.name ?? ""],
    ["Project", i.project_reference?.title ?? i.project_reference_text],
    ["Budget", i.estimated_budget],
    ["Timeline", i.estimated_timeline],
    ["Preferred contact", i.preferred_contact_method],
    ["Submitted from", i.source_page],
  ];
  const lines = rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  const adminUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/admin/inquiries/${String(i._id)}`;
  return `A new ${TYPE_LABEL[i.inquiry_type as keyof typeof TYPE_LABEL].toLowerCase()} was received on the Qmona website.\n\n${lines.join("\n")}\n\nMessage:\n${i.message}\n\nOpen in admin portal: ${adminUrl}\n`;
}

/** Attempts to email the agency and records the outcome on the inquiry. */
export async function sendInquiryNotification(inquiryId: unknown): Promise<void> {
  const inquiry = await Inquiry.findById(inquiryId).populate("service", "title").populate("industry", "name").populate("product_type", "name").populate("project_reference", "title");
  if (!inquiry) return;
  const now = new Date();
  inquiry.notification_attempts += 1;
  inquiry.notification_last_attempt_at = now;

  const recipients = env.INQUIRY_NOTIFICATION_EMAILS;
  const mailer = getTransport();
  if (!recipients.length) {
    inquiry.notification_status = "skipped";
    inquiry.notification_error = "No INQUIRY_NOTIFICATION_EMAILS configured.";
  } else if (!mailer) {
    inquiry.notification_status = "skipped";
    inquiry.notification_error = "Email (SMTP) is not configured.";
  } else {
    const subjectLine = inquiry.subject || inquiry.topic || "New website inquiry";
    try {
      await mailer.sendMail({
        from: env.EMAIL_FROM,
        to: recipients,
        replyTo: inquiry.email,
        subject: `[Qmona ${inquiry.reference}] ${subjectLine}`.slice(0, 200),
        text: buildBody(inquiry.toObject()),
      });
      inquiry.notification_status = "sent";
      inquiry.notification_sent_at = now;
      inquiry.notification_error = "";
    } catch (err) {
      inquiry.notification_status = "failed";
      inquiry.notification_error = `${err instanceof Error ? err.name : "Error"}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000);
      logger.warn("inquiry notification failed", { reference: inquiry.reference, error: err instanceof Error ? err.name : "unknown" });
    }
  }
  await inquiry.save();
}
