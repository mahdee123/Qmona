import { Router, type Request, type RequestHandler } from "express";
import type { QueryFilter, Model, PopulateOptions } from "mongoose";
import { Types } from "mongoose";
import type { z } from "zod";
import { ApiError } from "../errors/api-error.js";
import { logAudit } from "../modules/audit/audit.service.js";
import { paginated, pageParams } from "./pagination.js";
import { isObjectId, qs, qsBool, searchFilter } from "./query.js";
import { triggerRevalidate } from "./revalidate.js";
import { SerializeContext, type Doc } from "./serialize.js";

/**
 * Declarative description of one management resource (/api/v1/manage/<path>/).
 * `manageRouter` turns it into list / create / retrieve / patch / delete (+ reorder) routes with
 * validation, audit logging and frontend revalidation, so each feature module only states its rules.
 */
export interface ManageResource {
  path: string;
  model: Model<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Name shown in the audit log, e.g. "Service". */
  auditName: string;
  /** Role check, e.g. requireContentEditor. */
  guard: RequestHandler;
  /** Create schema. PATCH uses `schema.partial()` unless updateSchema is given. */
  schema: z.ZodObject<z.ZodRawShape>;
  updateSchema?: z.ZodType;
  serialize: (doc: Doc, ctx: SerializeContext, req: Request) => Record<string, unknown>;
  /** Top-level fields that hold media ids (single or array); loaded in one query per request. */
  mediaFields?: string[];
  populate?: (string | PopulateOptions)[];
  search?: string[];
  filters?: {
    bool?: string[];
    ref?: string[];
    eq?: string[];
    custom?: Record<string, (value: string, req: Request) => QueryFilter<any> | null>; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  baseFilter?: (req: Request) => QueryFilter<any> | Promise<QueryFilter<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  sort?: Record<string, 1 | -1>;
  /** Fields a client may sort by with ?ordering=field or ?ordering=-field. */
  sortable?: string[];
  /** Paginated envelope (default) or a plain array. */
  paginate?: boolean;
  /** Use this field in the URL instead of the id (for example "slug"). */
  lookup?: string;
  /** Cache tags to refresh on the public site after a change. */
  tags: string[];
  /** Per-record computed values (related counts...) loaded once per request. */
  extras?: (docs: Doc[]) => Promise<Record<string, Record<string, unknown>>>;
  /** Business rules and cross-field validation. May return a modified payload. */
  prepare?: (data: Doc, ctx: { existing: Doc | null; req: Request }) => Promise<Doc | void> | Doc | void;
  afterSave?: (doc: Doc, ctx: { req: Request; created: boolean }) => Promise<void>;
  beforeDelete?: (doc: Doc, req: Request) => Promise<void>;
  afterDelete?: (doc: Doc, req: Request) => Promise<void>;
  orderable?: boolean;
  /** Which operations exist. Everything is enabled by default. */
  disable?: ("create" | "delete")[];
  /** Routes that must be registered before "/:id" (exports, collections...). */
  extraRoutes?: (router: Router) => void;
}

const PUBLICATION_FIELDS = ["publication_status", "status", "is_published", "is_active", "is_visible"];

function auditLabel(doc: Doc): string {
  const v = doc.title ?? doc.name ?? doc.full_name ?? doc.question ?? doc.label ?? doc.client_name ?? doc.key ?? doc.slug ?? doc._id;
  return String(v).slice(0, 200);
}

function mediaIdsOf(docs: Doc[], fields: string[]): unknown[] {
  const ids: unknown[] = [];
  for (const d of docs) {
    for (const f of fields) {
      const v = d[f];
      if (Array.isArray(v)) ids.push(...v);
      else if (v) ids.push(v);
    }
  }
  return ids;
}

export async function buildContext(res: Pick<ManageResource, "mediaFields" | "extras">, docs: Doc[]): Promise<SerializeContext> {
  const extras = res.extras && docs.length ? await res.extras(docs) : {};
  return SerializeContext.build(mediaIdsOf(docs, res.mediaFields ?? []), extras);
}

export function manageRouter(r: ManageResource): Router {
  const router = Router();
  const paginate = r.paginate ?? true;
  const populate = r.populate ?? [];
  const lookupFilter = (value: string): QueryFilter<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (r.lookup) return { [r.lookup]: value };
    if (!isObjectId(value)) throw ApiError.notFound();
    return { _id: new Types.ObjectId(value) };
  };

  const findOne = async (value: string): Promise<Doc> => {
    const doc = await r.model.findOne(lookupFilter(value)).populate(populate).lean();
    if (!doc) throw ApiError.notFound();
    return doc;
  };

  const present = async (doc: Doc, req: Request) => {
    const ctx = await buildContext(r, [doc]);
    return r.serialize(doc, ctx, req);
  };

  const buildFilter = async (req: Request): Promise<QueryFilter<any>> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const clauses: QueryFilter<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (r.baseFilter) clauses.push(await r.baseFilter(req));
    const f = r.filters ?? {};
    for (const name of f.bool ?? []) {
      const v = qsBool(req, name);
      if (v !== null) clauses.push({ [name]: v });
    }
    for (const name of f.ref ?? []) {
      const v = qs(req, name);
      if (v && isObjectId(v)) clauses.push({ [name]: new Types.ObjectId(v) });
    }
    for (const name of f.eq ?? []) {
      const v = qs(req, name);
      if (v) clauses.push({ [name]: v });
    }
    for (const [name, build] of Object.entries(f.custom ?? {})) {
      const v = qs(req, name);
      if (v) {
        const c = build(v, req);
        if (c) clauses.push(c);
      }
    }
    const s = searchFilter(qs(req, "search"), r.search ?? []);
    if (s) clauses.push(s);
    return clauses.length ? { $and: clauses } : {};
  };

  const buildSort = (req: Request): Record<string, 1 | -1> => {
    const ordering = qs(req, "ordering");
    if (ordering) {
      const desc = ordering.startsWith("-");
      const field = desc ? ordering.slice(1) : ordering;
      if ((r.sortable ?? []).includes(field)) return { [field]: desc ? -1 : 1, _id: 1 };
    }
    return { ...(r.sort ?? { created_at: -1 }), _id: 1 };
  };

  // ---- list ---------------------------------------------------------------------------------
  router.get("/", r.guard, async (req, res) => {
    const filter = await buildFilter(req);
    const sort = buildSort(req);
    if (!paginate) {
      const docs = await r.model.find(filter).sort(sort).populate(populate).lean();
      const ctx = await buildContext(r, docs);
      return void res.json(docs.map((d) => r.serialize(d, ctx, req)));
    }
    const { page, pageSize, skip } = pageParams(req);
    const [docs, count] = await Promise.all([
      r.model.find(filter).sort(sort).skip(skip).limit(pageSize).populate(populate).lean(),
      r.model.countDocuments(filter),
    ]);
    const ctx = await buildContext(r, docs);
    res.json(paginated(req, docs.map((d) => r.serialize(d, ctx, req)), count, page, pageSize));
  });

  // ---- routes that must come before "/:id" ---------------------------------------------------
  r.extraRoutes?.(router);

  if (r.orderable) {
    router.post("/reorder", r.guard, async (req, res) => {
      const ids: unknown = req.body?.ids;
      if (!Array.isArray(ids) || !ids.length || !ids.every((i) => typeof i === "string" && isObjectId(i))) {
        throw ApiError.validation({ ids: ["Provide a non-empty list of ids."] }, 'Provide a non-empty "ids" list.');
      }
      const unique = [...new Set(ids as string[])];
      const found = await r.model.countDocuments({ _id: { $in: unique } });
      if (found !== unique.length) throw new ApiError(400, "not_found", "Some ids were not found.");
      await r.model.bulkWrite(
        unique.map((id, position) => ({ updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $set: { order: position } } } })),
      );
      await logAudit({ req, action: "update", target_model: r.auditName, details: { reordered: unique } });
      triggerRevalidate(r.tags);
      res.json({ detail: "Order saved." });
    });
  }

  // ---- create -------------------------------------------------------------------------------
  if (!r.disable?.includes("create")) {
    router.post("/", r.guard, async (req, res) => {
      let data: Doc = r.schema.parse(req.body ?? {});
      data = (await r.prepare?.(data, { existing: null, req })) ?? data;
      const created = await r.model.create(data);
      await r.afterSave?.(created.toObject(), { req, created: true });
      const doc = await findOne(String(r.lookup ? (created as Doc)[r.lookup] : created._id));
      await logAudit({ req, action: "create", target_model: r.auditName, target_id: String(doc._id), details: { label: auditLabel(doc) } });
      triggerRevalidate(r.tags);
      res.status(201).json(await present(doc, req));
    });
  }

  // ---- retrieve -----------------------------------------------------------------------------
  router.get("/:id", r.guard, async (req, res) => {
    res.json(await present(await findOne(String(req.params.id)), req));
  });

  // ---- update -------------------------------------------------------------------------------
  router.patch("/:id", r.guard, async (req, res) => {
    const doc = await r.model.findOne(lookupFilter(String(req.params.id)));
    if (!doc) throw ApiError.notFound();
    const existing = doc.toObject() as Doc;
    const patchSchema = r.updateSchema ?? r.schema.partial();
    let data: Doc = patchSchema.parse(req.body ?? {}) as Doc;
    data = (await r.prepare?.(data, { existing, req })) ?? data;

    doc.set(data);
    await doc.save();
    await r.afterSave?.(doc.toObject(), { req, created: false });

    const fresh = await findOne(String(r.lookup ? (doc as Doc)[r.lookup] : doc._id));
    const changed: Record<string, { from: string; to: string }> = {};
    for (const f of PUBLICATION_FIELDS) {
      if (f in existing && String(existing[f]) !== String(fresh[f])) changed[f] = { from: String(existing[f]), to: String(fresh[f]) };
    }
    const details: Record<string, unknown> = { label: auditLabel(fresh), fields: Object.keys(data).sort() };
    if (Object.keys(changed).length) details.publication = changed;
    await logAudit({
      req,
      action: Object.keys(changed).length ? "publish" : "update",
      target_model: r.auditName,
      target_id: String(fresh._id),
      details,
    });
    triggerRevalidate(r.tags);
    res.json(await present(fresh, req));
  });

  // ---- delete -------------------------------------------------------------------------------
  if (!r.disable?.includes("delete")) {
    router.delete("/:id", r.guard, async (req, res) => {
      const doc = await r.model.findOne(lookupFilter(String(req.params.id))).lean();
      if (!doc) throw ApiError.notFound();
      await r.beforeDelete?.(doc, req);
      await r.model.deleteOne({ _id: doc._id });
      await r.afterDelete?.(doc, req);
      await logAudit({ req, action: "delete", target_model: r.auditName, target_id: String(doc._id), details: { label: auditLabel(doc) } });
      triggerRevalidate(r.tags);
      res.status(204).send();
    });
  }

  return router;
}
