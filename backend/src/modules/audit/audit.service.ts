import type { Request } from "express";
import { Types } from "mongoose";
import { AuditEvent, type AuditAction } from "./audit.model.js";
import type { AuthUser } from "../user/user.interface.js";
import { logger } from "../../lib/logger.js";

interface AuditInput {
  actor?: AuthUser | null;
  action: AuditAction;
  target_model: string;
  target_id?: string | Types.ObjectId | number;
  details?: Record<string, unknown>;
  req?: Request;
}

/** Records an administrative action. A failure to write the audit trail must never break the request. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const actor = input.actor ?? input.req?.user ?? null;
    await AuditEvent.create({
      actor: actor ? new Types.ObjectId(actor.id) : null,
      actor_email: actor?.email ?? null,
      action: input.action,
      target_model: input.target_model,
      target_id: input.target_id === undefined ? "" : String(input.target_id),
      details: input.details ?? {},
      ip_address: input.req?.ip ?? null,
    });
  } catch (err) {
    logger.warn("audit write failed", { message: err instanceof Error ? err.message : String(err) });
  }
}
