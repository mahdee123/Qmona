import { Router, type Request } from "express";
import { Types, type QueryFilter } from "mongoose";
import { ApiError } from "../../errors/api-error.js";
import { pageParams, paginated } from "../../lib/pagination.js";
import { isObjectId, qs, qsBool, searchFilter } from "../../lib/query.js";
import { pick, sid, type Doc } from "../../lib/serialize.js";
import { currentUser, requireInquiryManager } from "../../middleware/auth.js";
import { logAudit } from "../audit/audit.service.js";
import { User } from "../user/user.model.js";
import { Inquiry, INQUIRY_STATUSES, submissionHash } from "./inquiries.model.js";
import { buildInquiryFields, csvCell } from "./inquiries.service.js";
import { sendInquiryNotification } from "./notifications.js";
import { noteSchema, publicInquirySchema, statusSchema, updateInquirySchema } from "./inquiries.validation.js";

const DUPLICATE_WINDOW_MS = 10 * 60_000;

// ---- public submission ---------------------------------------------------------------------------------
export function inquiriesPublicRoutes(api: Router, limiter: import("express").RequestHandler) {
  /**
   * POST /api/v1/inquiries/ — contact or support submission.
   * Order: validate -> ignore bots -> reject duplicates -> save -> answer -> attempt the notification.
   * A notification problem is recorded and never turns into a failed submission.
   */
  api.post("/inquiries", limiter, async (req, res) => {
    const input = publicInquirySchema.parse(req.body ?? {});
    // Honeypot: pretend success, store nothing.
    if (input.hp_website) return void res.status(201).json({ detail: "Thank you. We received your message.", reference: null });

    const fields = await buildInquiryFields(input);
    const hash = submissionHash(input.inquiry_type, input.email, input.message);
    const existing = await Inquiry.findOne({ submission_hash: hash, created_at: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } }).sort({ created_at: -1 }).lean();
    if (existing) {
      return void res.status(200).json({
        detail: "We already received this message a moment ago — no need to send it again.",
        reference: existing.reference,
        duplicate: true,
      });
    }

    const inquiry = await Inquiry.create({
      ...fields,
      submission_hash: hash,
      ip_address: req.ip ?? "",
      user_agent: (req.get("user-agent") ?? "").slice(0, 500),
    });
    res.status(201).json({ detail: "Thank you. We received your message.", reference: inquiry.reference, duplicate: false });
    // Saved and answered; email problems are recorded on the inquiry, never surfaced to the visitor.
    await sendInquiryNotification(inquiry._id).catch(() => undefined);
  });
}

// ---- management serializers ----------------------------------------------------------------------------
const userRef = (u: Doc | null | undefined) =>
  u && typeof u === "object" && "email" in u ? { id: sid(u._id), email: u.email, name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username } : null;

const listItem = (i: Doc) => ({
  id: sid(i._id),
  ...pick(i, ["reference", "inquiry_type", "full_name", "email", "company", "topic", "subject", "support_category"]),
  service_title: i.service?.title ?? null,
  industry_name: i.industry?.name ?? null,
  status: i.status,
  is_read: i.is_read,
  is_archived: i.is_archived,
  assigned_to: userRef(i.assigned_to),
  notification_status: i.notification_status,
  created_at: i.created_at,
});

const detail = (i: Doc) => ({
  id: sid(i._id),
  ...pick(i, ["reference", "inquiry_type", "full_name", "email", "phone_country_code", "phone", "company", "topic", "subject", "support_category"]),
  service: i.service?.title ? { title: i.service.title, slug: i.service.slug } : null,
  industry: i.industry?.name ? { name: i.industry.name, slug: i.industry.slug } : null,
  product_type: i.product_type?.name ? { name: i.product_type.name, slug: i.product_type.slug } : null,
  project_reference: i.project_reference?.title ? { title: i.project_reference.title, slug: i.project_reference.slug, id: sid(i.project_reference._id) } : null,
  ...pick(i, ["project_reference_text", "estimated_budget", "estimated_timeline", "preferred_contact_method", "submitted_choices", "message", "privacy_acknowledged", "source_page", "is_read", "is_archived", "archived_at"]),
  assigned_to: userRef(i.assigned_to),
  ...pick(i, ["status", "notification_status", "notification_error", "notification_attempts", "notification_last_attempt_at", "notification_sent_at", "ip_address"]),
  notes: [...(i.notes ?? [])].sort((a: Doc, b: Doc) => +new Date(b.created_at) - +new Date(a.created_at)).map(noteOut),
  status_history: [...(i.status_history ?? [])].sort((a: Doc, b: Doc) => +new Date(b.created_at) - +new Date(a.created_at)).map((h: Doc) => ({
    id: sid(h._id),
    from_status: h.from_status,
    to_status: h.to_status,
    changed_by: userRef(h.changed_by),
    comment: h.comment,
    created_at: h.created_at,
  })),
  created_at: i.created_at,
  updated_at: i.updated_at,
});

const noteOut = (n: Doc) => ({ id: sid(n._id), author: userRef(n.author), note: n.note, created_at: n.created_at });

const POPULATE = [
  { path: "service", select: "title slug" },
  { path: "industry", select: "name slug" },
  { path: "product_type", select: "name slug" },
  { path: "project_reference", select: "title slug" },
  { path: "assigned_to", select: "email username first_name last_name" },
  { path: "notes.author", select: "email username first_name last_name" },
  { path: "status_history.changed_by", select: "email username first_name last_name" },
];

/** Staff who can be assigned inquiries. */
const assignableFilter: QueryFilter<any> = { is_active: true, role: { $in: ["super_admin", "inquiry_manager"] } }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function listFilter(req: Request): Promise<QueryFilter<any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const clauses: QueryFilter<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const f of ["inquiry_type", "status", "notification_status"] as const) {
    const v = qs(req, f);
    if (v) clauses.push({ [f]: v });
  }
  const read = qsBool(req, "is_read");
  if (read !== null) clauses.push({ is_read: read });
  const archived = qs(req, "archived") || "false";
  if (archived === "true" || archived === "false") clauses.push({ is_archived: archived === "true" });

  const assigned = qs(req, "assigned_to");
  if (assigned === "me") clauses.push({ assigned_to: new Types.ObjectId(currentUser(req).id) });
  else if (assigned === "none") clauses.push({ assigned_to: null });
  else if (assigned && isObjectId(assigned)) clauses.push({ assigned_to: new Types.ObjectId(assigned) });

  const service = qs(req, "service");
  if (service) {
    const { Service } = await import("../services/services.model.js");
    clauses.push({ service: { $in: (await Service.find({ slug: service }, "_id").lean()).map((s) => s._id) } });
  }
  const industry = qs(req, "industry");
  if (industry) {
    const { Industry } = await import("../industries/industries.model.js");
    clauses.push({ industry: { $in: (await Industry.find({ slug: industry }, "_id").lean()).map((s) => s._id) } });
  }
  // Day boundaries use the agency's local time (Dhaka, UTC+6).
  const from = qs(req, "date_from");
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) clauses.push({ created_at: { $gte: new Date(`${from}T00:00:00+06:00`) } });
  const to = qs(req, "date_to");
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) clauses.push({ created_at: { $lte: new Date(`${to}T23:59:59.999+06:00`) } });

  const search = searchFilter(qs(req, "search"), ["full_name", "email", "company", "topic", "subject", "message", "reference"]);
  if (search) clauses.push(search);
  return clauses.length ? { $and: clauses } : {};
}

async function findInquiry(req: Request) {
  const id = String(req.params.id);
  if (!isObjectId(id)) throw ApiError.notFound();
  const doc = await Inquiry.findById(id);
  if (!doc) throw ApiError.notFound();
  return doc;
}

const loadDetail = async (id: unknown) => detail((await Inquiry.findById(id).populate(POPULATE).lean()) as Doc);

export function inquiriesManageRoutes(manage: Router) {
  const router = Router();
  router.use(requireInquiryManager);

  router.get("/", async (req, res) => {
    const filter = await listFilter(req);
    const ordering = qs(req, "ordering");
    const field = ordering.replace(/^-/, "");
    const sort: Record<string, 1 | -1> = ["created_at", "status", "full_name"].includes(field) ? { [field]: ordering.startsWith("-") ? -1 : 1 } : { created_at: -1 };
    const { page, pageSize, skip } = pageParams(req);
    const [docs, count] = await Promise.all([
      Inquiry.find(filter).sort({ ...sort, _id: 1 }).skip(skip).limit(pageSize).populate(POPULATE.slice(0, 5)).lean(),
      Inquiry.countDocuments(filter),
    ]);
    res.json(paginated(req, docs.map(listItem), count, page, pageSize));
  });

  router.get("/assignees", async (_req, res) => {
    const users = await User.find(assignableFilter).sort({ first_name: 1, email: 1 }).lean();
    res.json(users.map((u) => userRef(u)));
  });

  router.get("/export", async (req, res) => {
    const docs = await Inquiry.find(await listFilter(req)).sort({ created_at: -1 }).limit(10_000).populate(POPULATE.slice(0, 5)).lean();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="qmona-inquiries-${stamp}.csv"`);
    const header = ["Reference", "Received", "Type", "Status", "Name", "Email", "Phone", "Company", "Topic", "Subject", "Issue category", "Service", "Industry", "Product type", "Project", "Budget", "Timeline", "Preferred contact", "Message", "Assigned to", "Archived", "Notification"];
    const lines = [header.map(csvCell).join(",")];
    for (const i of docs as Doc[]) {
      lines.push(
        [
          i.reference, new Date(i.created_at).toISOString().replace("T", " ").slice(0, 16), i.inquiry_type === "contact" ? "Project inquiry" : "Support request", i.status,
          i.full_name, i.email, `${i.phone_country_code} ${i.phone}`.trim(), i.company, i.topic, i.subject, i.support_category,
          i.service?.title ?? "", i.industry?.name ?? "", i.product_type?.name ?? "", i.project_reference?.title ?? i.project_reference_text,
          i.estimated_budget, i.estimated_timeline, i.preferred_contact_method, i.message, userRef(i.assigned_to)?.email ?? "", i.is_archived ? "yes" : "no", i.notification_status,
        ].map(csvCell).join(","),
      );
    }
    await logAudit({ req, action: "export", target_model: "Inquiry", details: { rows: docs.length, filters: req.query } });
    res.send(`﻿${lines.join("\r\n")}\r\n`);
  });

  router.get("/:id", async (req, res) => {
    const inquiry = await findInquiry(req);
    if (!inquiry.is_read) {
      inquiry.is_read = true;
      await inquiry.save();
    }
    res.json(await loadDetail(inquiry._id));
  });

  router.patch("/:id", async (req, res) => {
    const inquiry = await findInquiry(req);
    const changes = updateInquirySchema.parse(req.body ?? {});
    if (changes.assigned_to) {
      const ok = await User.exists({ _id: changes.assigned_to, ...assignableFilter });
      if (!ok) throw ApiError.fieldError("assigned_to", "This user cannot be assigned inquiries.");
    }
    if (changes.is_archived !== undefined && changes.is_archived !== inquiry.is_archived) inquiry.archived_at = changes.is_archived ? new Date() : null;
    inquiry.set({
      ...(changes.assigned_to !== undefined ? { assigned_to: changes.assigned_to } : {}),
      ...(changes.is_read !== undefined ? { is_read: changes.is_read } : {}),
      ...(changes.is_archived !== undefined ? { is_archived: changes.is_archived } : {}),
    });
    await inquiry.save();
    await logAudit({ req, action: "update", target_model: "Inquiry", target_id: String(inquiry._id), details: changes });
    res.json(await loadDetail(inquiry._id));
  });

  router.delete("/:id", async (req, res) => {
    const inquiry = await findInquiry(req);
    if (qs(req, "confirm") !== inquiry.reference) {
      throw new ApiError(400, "confirmation_required", "Confirm deletion by passing ?confirm=<reference>.");
    }
    await Inquiry.deleteOne({ _id: inquiry._id });
    await logAudit({ req, action: "delete", target_model: "Inquiry", target_id: String(inquiry._id), details: { reference: inquiry.reference } });
    res.status(204).send();
  });

  router.post("/:id/notes", async (req, res) => {
    const inquiry = await findInquiry(req);
    const { note } = noteSchema.parse(req.body ?? {});
    inquiry.notes.push({ author: new Types.ObjectId(currentUser(req).id), note, created_at: new Date() } as never);
    await inquiry.save();
    const saved = inquiry.notes[inquiry.notes.length - 1]!;
    await logAudit({ req, action: "update", target_model: "Inquiry", target_id: String(inquiry._id), details: { note_added: String(saved._id) } });
    const author = await User.findById(currentUser(req).id).lean();
    res.status(201).json(noteOut({ ...(saved as unknown as Doc).toObject?.(), _id: saved._id, note, created_at: saved.created_at, author }));
  });

  router.post("/:id/status", async (req, res) => {
    const inquiry = await findInquiry(req);
    const { status, comment } = statusSchema.parse(req.body ?? {});
    const old = inquiry.status;
    if (old !== status) {
      inquiry.status = status;
      inquiry.status_history.push({ from_status: old, to_status: status, changed_by: new Types.ObjectId(currentUser(req).id), comment: comment ?? "", created_at: new Date() } as never);
      await inquiry.save();
      await logAudit({ req, action: "status_change", target_model: "Inquiry", target_id: String(inquiry._id), details: { from: old, to: status } });
    }
    res.json(await loadDetail(inquiry._id));
  });

  router.post("/:id/retry-notification", async (req, res) => {
    const inquiry = await findInquiry(req);
    if (inquiry.notification_status === "sent" && req.body?.force !== true) {
      throw new ApiError(400, "already_sent", 'Notification was already sent. Pass {"force": true} to resend.');
    }
    await sendInquiryNotification(inquiry._id);
    const fresh = await Inquiry.findById(inquiry._id).lean();
    await logAudit({ req, action: "notification_retry", target_model: "Inquiry", target_id: String(inquiry._id), details: { result: fresh?.notification_status } });
    res.json({
      notification_status: fresh?.notification_status,
      notification_error: fresh?.notification_error,
      notification_attempts: fresh?.notification_attempts,
    });
  });

  manage.use("/inquiries", router);
}

export { INQUIRY_STATUSES };
