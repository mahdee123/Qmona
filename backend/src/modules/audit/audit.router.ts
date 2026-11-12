import { Router } from "express";
import type { QueryFilter } from "mongoose";
import { ApiError } from "../../errors/api-error.js";
import { pageParams, paginated } from "../../lib/pagination.js";
import { isObjectId, qs, searchFilter } from "../../lib/query.js";
import { sid } from "../../lib/serialize.js";
import { requireSuperAdmin } from "../../middleware/auth.js";
import { AuditEvent, type AuditAttrs } from "./audit.model.js";

type Row = AuditAttrs & { _id: unknown };
const out = (e: Row) => ({
  id: sid(e._id),
  actor: sid(e.actor),
  actor_email: e.actor_email,
  action: e.action,
  target_model: e.target_model,
  target_id: e.target_id,
  details: e.details,
  ip_address: e.ip_address,
  created_at: e.created_at,
});

/** /api/v1/manage/audit-events — read-only trail, Super Admin only. */
export const auditRouter = Router();
auditRouter.use(requireSuperAdmin);

auditRouter.get("/", async (req, res) => {
  const clauses: QueryFilter<AuditAttrs>[] = [];
  const action = qs(req, "action");
  if (action) clauses.push({ action: action as AuditAttrs["action"] });
  const target = qs(req, "target_model");
  if (target) clauses.push({ target_model: target });
  const actor = qs(req, "actor");
  if (actor && isObjectId(actor)) clauses.push({ actor } as QueryFilter<AuditAttrs>);
  const search = searchFilter(qs(req, "search"), ["target_id", "target_model", "actor_email"]);
  if (search) clauses.push(search as QueryFilter<AuditAttrs>);
  const filter = clauses.length ? { $and: clauses } : {};
  const { page, pageSize, skip } = pageParams(req);
  const [docs, count] = await Promise.all([
    AuditEvent.find(filter).sort({ created_at: -1, _id: -1 }).skip(skip).limit(pageSize).lean(),
    AuditEvent.countDocuments(filter),
  ]);
  res.json(paginated(req, docs.map((d) => out(d as Row)), count, page, pageSize));
});

auditRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!isObjectId(id)) throw ApiError.notFound();
  const doc = await AuditEvent.findById(id).lean();
  if (!doc) throw ApiError.notFound();
  res.json(out(doc as Row));
});
