import { Schema, model, type Types } from "mongoose";

export const AUDIT_ACTIONS = [
  "create", "update", "delete", "login", "logout", "status_change", "export",
  "publish", "notification_retry", "login_failed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditAttrs {
  actor: Types.ObjectId | null;
  actor_email: string | null;
  action: AuditAction;
  target_model: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: Date;
}

const auditSchema = new Schema<AuditAttrs>({
  actor: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  actor_email: { type: String, default: null },
  action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
  target_model: { type: String, required: true, index: true },
  target_id: { type: String, default: "" },
  details: { type: Schema.Types.Mixed, default: {} },
  ip_address: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: true },
});
auditSchema.index({ target_model: 1, target_id: 1 });

export const AuditEvent = model<AuditAttrs>("AuditEvent", auditSchema);
