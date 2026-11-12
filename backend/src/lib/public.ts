import { Router, type Request } from "express";
import type { Model, PopulateOptions, QueryFilter } from "mongoose";
import { ApiError } from "../errors/api-error.js";
import { buildContext } from "./crud.js";
import { pageParams, paginated } from "./pagination.js";
import type { Doc, SerializeContext } from "./serialize.js";

/**
 * Read-only public endpoints (/api/v1/<path>/). Only rows that pass `filter` are ever visible,
 * so unpublished content cannot leak through list or detail routes.
 */
export interface PublicResource {
  model: Model<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Rows visible to the public (published / active only). */
  filter: (req: Request) => QueryFilter<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Extra filters that only apply to the list route (query string filters). */
  listFilter?: (req: Request) => QueryFilter<any> | Promise<QueryFilter<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  sort: Record<string, 1 | -1>;
  populate?: (string | PopulateOptions)[];
  mediaFields?: string[];
  extras?: (docs: Doc[]) => Promise<Record<string, Record<string, unknown>>>;
  paginate?: boolean;
  /** Detail lookups use this field (usually "slug"); omit for list-only resources. */
  lookup?: string;
  serializeList: (doc: Doc, ctx: SerializeContext, req: Request) => Record<string, unknown>;
  serializeDetail?: (doc: Doc, ctx: SerializeContext, req: Request) => Record<string, unknown>;
  /** Routes that must be registered before "/:slug" (for example "/:slug/related"). */
  extraRoutes?: (router: Router) => void;
}

export function publicRouter(r: PublicResource): Router {
  const router = Router();
  const populate = r.populate ?? [];

  router.get("/", async (req, res) => {
    const filter = { $and: [r.filter(req), (await r.listFilter?.(req)) ?? {}] };
    if (!r.paginate) {
      const docs = await r.model.find(filter).sort({ ...r.sort, _id: 1 }).populate(populate).lean();
      const ctx = await buildContext(r, docs);
      return void res.json(docs.map((d) => r.serializeList(d, ctx, req)));
    }
    const { page, pageSize, skip } = pageParams(req);
    const [docs, count] = await Promise.all([
      r.model.find(filter).sort({ ...r.sort, _id: 1 }).skip(skip).limit(pageSize).populate(populate).lean(),
      r.model.countDocuments(filter),
    ]);
    const ctx = await buildContext(r, docs);
    res.json(paginated(req, docs.map((d) => r.serializeList(d, ctx, req)), count, page, pageSize));
  });

  r.extraRoutes?.(router);

  if (r.lookup) {
    const lookup = r.lookup;
    router.get(`/:${lookup}`, async (req, res) => {
      const doc = await r.model.findOne({ $and: [r.filter(req), { [lookup]: String(req.params[lookup]) }] }).populate(populate).lean();
      if (!doc) throw ApiError.notFound();
      const ctx = await buildContext(r, [doc]);
      res.json((r.serializeDetail ?? r.serializeList)(doc, ctx, req));
    });
  }
  return router;
}
