import { Router, type Request } from "express";
import type { QueryFilter } from "mongoose";
import { ApiError } from "../../errors/api-error.js";
import { manageRouter } from "../../lib/crud.js";
import { publicRouter } from "../../lib/public.js";
import { escapeRegex, qs, qsBool, qsList } from "../../lib/query.js";
import { assertMediaExist, assertRefsExist } from "../../lib/refs.js";
import { SerializeContext, dec, pick, sid, sids, type Doc } from "../../lib/serialize.js";
import { requireContentEditor } from "../../middleware/auth.js";
import { Industry } from "../industries/industries.model.js";
import { loadMediaMap } from "../media/media.service.js";
import { Service } from "../services/services.model.js";
import { Testimonial } from "../cms/cms.model.js";
import { Inquiry } from "../inquiries/inquiries.model.js";
import { ProductType, Project, ProjectGalleryItem, Technology } from "./portfolio.model.js";
import { gallerySchema, productTypeSchema, projectSchema, technologySchema } from "./portfolio.validation.js";

// ---- project filters shared by the public and management lists -----------------------------------------
const GROUPS = [
  { param: "services", aliases: ["service"], model: Service, field: "services", nameField: "title" },
  { param: "industries", aliases: ["industry"], model: Industry, field: "industries", nameField: "name" },
  { param: "product_types", aliases: ["product_type", "type"], model: ProductType, field: "product_types", nameField: "name" },
  { param: "technologies", aliases: ["technology", "tech"], model: Technology, field: "technologies", nameField: "name" },
] as const;

/** OR within a group (?services=a,b), AND across groups; plus a free-text search over the project and its tags. */
export async function projectListFilter(req: Request): Promise<QueryFilter<Doc>> {
  const clauses: QueryFilter<Doc>[] = [];
  for (const g of GROUPS) {
    const slugs = qsList(req, g.param, ...g.aliases);
    if (!slugs.length) continue;
    const ids = (await (g.model as typeof Service).find({ slug: { $in: slugs } }, "_id").lean()).map((d) => d._id);
    clauses.push({ [g.field]: { $in: ids } });
  }
  const term = (qs(req, "search") || qs(req, "q")).slice(0, 100);
  if (term) {
    const re = new RegExp(escapeRegex(term), "i");
    const related = await Promise.all(
      GROUPS.map(async (g) => ({ field: g.field, ids: (await (g.model as typeof Service).find({ [g.nameField]: re }, "_id").lean()).map((d) => d._id) })),
    );
    clauses.push({
      $or: [
        ...["title", "tagline", "summary", "challenge", "solution"].map((f) => ({ [f]: re })),
        ...related.filter((r) => r.ids.length).map((r) => ({ [r.field]: { $in: r.ids } })),
      ],
    });
  }
  if (qsBool(req, "featured") === true) clauses.push({ is_featured: true });
  return clauses.length ? { $and: clauses } : {};
}

// ---- public serializers --------------------------------------------------------------------------------
const ref = (o: Doc, nameField = "name") => ({ name: o[nameField], slug: o.slug });
const activeRefs = (list: unknown, nameField = "name") =>
  ((list as Doc[]) ?? []).filter((o) => o && typeof o === "object" && "slug" in o && o.is_active).map((o) => ref(o, nameField));

export const maskedClientName = (p: Doc) => (!p.client_name ? "" : p.is_client_name_visible ? p.client_name : "Confidential client");

export function publicProjectList(p: Doc, ctx: SerializeContext) {
  return {
    id: sid(p._id),
    title: p.title,
    slug: p.slug,
    tagline: p.tagline,
    summary: p.summary,
    thumbnail: ctx.media(p.thumbnail_image) ?? ctx.media(p.cover_image),
    services: activeRefs(p.services, "title"),
    industries: activeRefs(p.industries),
    product_types: activeRefs(p.product_types),
    client_name: maskedClientName(p),
    delivery_status: p.delivery_status,
    is_featured: p.is_featured,
    published_at: p.published_at,
  };
}

export function publicProjectDetail(p: Doc, ctx: SerializeContext) {
  const extra = ctx.extra(p._id);
  const budgetVisible = p.is_budget_visible && (p.budget_min != null || p.budget_max != null);
  const links = p.is_external_link_visible ? { live_url: p.live_url || null, repo_url: p.repo_url || null } : null;
  return {
    ...publicProjectList(p, ctx),
    cover_image: ctx.media(p.cover_image),
    // The client logo is only shown together with a visible client name.
    client_logo: p.client_logo && p.is_client_name_visible && p.client_name ? ctx.media(p.client_logo) : null,
    gallery: extra.gallery ?? [],
    technologies: activeRefs(p.technologies),
    ...pick(p, ["qmona_role", "challenge", "approach", "solution", "key_features", "case_study_sections", "timeline"]),
    budget: budgetVisible ? { min: dec(p.budget_min), max: dec(p.budget_max), currency: p.currency } : null,
    verified_results: p.verified_results ?? [],
    external_links: links && (links.live_url || links.repo_url) ? links : null,
    testimonial: extra.testimonial ?? null,
    ...pick(p, ["meta_title", "meta_description", "updated_at"]),
  };
}

/** Gallery images and the approved testimonial for the public project page. */
export async function projectPublicExtras(docs: Doc[]) {
  const ids = docs.map((d) => d._id);
  const [items, testimonials] = await Promise.all([
    ProjectGalleryItem.find({ project: { $in: ids } }).sort({ order: 1, created_at: 1 }).lean(),
    Testimonial.find({ project: { $in: ids }, is_published: true, is_verified: true }).sort({ order: 1 }).lean(),
  ]);
  const media = await loadMediaMap(items.map((i) => i.media_asset));
  const out: Record<string, Record<string, unknown>> = {};
  for (const p of docs) {
    const key = String(p._id);
    const t = testimonials.find((x) => String(x.project) === key);
    out[key] = {
      gallery: items
        .filter((i) => String(i.project) === key && media.has(String(i.media_asset)))
        .map((i) => ({
          id: sid(i._id),
          media: media.get(String(i.media_asset)),
          ...pick(i, ["caption", "alt_text", "kind", "layout", "order"]),
        })),
      testimonial: t ? { content: t.content, client_name: t.client_name, client_role: t.client_role, company_name: t.company_name } : null,
    };
  }
  return out;
}

export const projectPopulate = [
  { path: "services", select: "title slug is_active" },
  { path: "industries", select: "name slug is_active" },
  { path: "product_types", select: "name slug is_active" },
  { path: "technologies", select: "name slug is_active" },
];

// ---- manage serializers --------------------------------------------------------------------------------
function manageGalleryItem(g: Doc, ctx: SerializeContext) {
  return {
    id: sid(g._id),
    project: sid(g.project),
    media_asset: sid(g.media_asset),
    media: ctx.media(g.media_asset),
    ...pick(g, ["caption", "alt_text", "kind", "layout", "order"]),
  };
}

function manageProject(p: Doc, ctx: SerializeContext) {
  const extra = ctx.extra(p._id);
  return {
    id: sid(p._id),
    ...pick(p, ["title", "slug", "tagline", "summary"]),
    cover_image: sid(p.cover_image),
    cover_image_detail: ctx.media(p.cover_image),
    thumbnail_image: sid(p.thumbnail_image),
    thumbnail_image_detail: ctx.media(p.thumbnail_image),
    services: sids(p.services),
    industries: sids(p.industries),
    product_types: sids(p.product_types),
    technologies: sids(p.technologies),
    client_name: p.client_name,
    client_logo: sid(p.client_logo),
    ...pick(p, ["is_client_name_visible", "qmona_role", "delivery_status", "publication_status", "challenge", "approach", "solution", "key_features", "case_study_sections", "timeline"]),
    budget_min: dec(p.budget_min),
    budget_max: dec(p.budget_max),
    currency: p.currency,
    ...pick(p, ["is_budget_visible", "verified_results", "live_url", "repo_url", "is_external_link_visible", "published_at", "is_featured", "order", "meta_title", "meta_description"]),
    gallery_items: extra.gallery_items ?? [],
    inquiries_count: extra.inquiries_count ?? 0,
    ...pick(p, ["created_at", "updated_at"]),
  };
}

async function projectManageExtras(docs: Doc[]) {
  const ids = docs.map((d) => d._id);
  const [items, counts] = await Promise.all([
    ProjectGalleryItem.find({ project: { $in: ids } }).sort({ order: 1, created_at: 1 }).lean(),
    Inquiry.aggregate([{ $match: { project_reference: { $in: ids } } }, { $group: { _id: "$project_reference", n: { $sum: 1 } } }]),
  ]);
  const media = await loadMediaMap(items.map((i) => i.media_asset));
  const ctx = new SerializeContext(media);
  return Object.fromEntries(
    docs.map((p) => [
      String(p._id),
      {
        gallery_items: items.filter((i) => String(i.project) === String(p._id)).map((i) => manageGalleryItem(i, ctx)),
        inquiries_count: counts.find((c) => String(c._id) === String(p._id))?.n ?? 0,
      },
    ]),
  );
}

/** How many projects use each taxonomy entry (for the admin list). */
async function usageCounts(field: "product_types" | "technologies", docs: Doc[]) {
  const ids = docs.map((d) => d._id);
  const rows = await Project.aggregate([{ $match: { [field]: { $in: ids } } }, { $unwind: `$${field}` }, { $match: { [field]: { $in: ids } } }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  return Object.fromEntries(docs.map((d) => [String(d._id), { projects_count: rows.find((r) => String(r._id) === String(d._id))?.n ?? 0 }]));
}

// ---- routes --------------------------------------------------------------------------------------------
export function portfolioPublicRoutes(api: Router) {
  api.use(
    "/product-types",
    publicRouter({
      model: ProductType,
      filter: () => ({ is_active: true }),
      sort: { order: 1, name: 1 },
      lookup: "slug",
      serializeList: (t) => ({ id: sid(t._id), ...pick(t, ["name", "slug", "description", "icon_key"]) }),
    }),
  );
  api.use(
    "/technologies",
    publicRouter({
      model: Technology,
      filter: () => ({ is_active: true }),
      sort: { order: 1, name: 1 },
      lookup: "slug",
      serializeList: (t) => ({ id: sid(t._id), ...pick(t, ["name", "slug", "category"]) }),
    }),
  );
  api.use(
    "/projects",
    publicRouter({
      model: Project,
      filter: () => ({ publication_status: "Published" }),
      listFilter: projectListFilter,
      sort: { order: 1, published_at: -1, created_at: -1 },
      populate: projectPopulate,
      mediaFields: ["cover_image", "thumbnail_image", "client_logo"],
      extras: projectPublicExtras,
      paginate: true,
      lookup: "slug",
      serializeList: publicProjectList,
      serializeDetail: publicProjectDetail,
      extraRoutes: (router) => {
        router.get("/:slug/related", async (req, res) => {
          const project = await Project.findOne({ slug: String(req.params.slug), publication_status: "Published" }).lean();
          if (!project) throw ApiError.notFound();
          const others = await Project.find({ publication_status: "Published", _id: { $ne: project._id } })
            .sort({ order: 1, published_at: -1 })
            .populate(projectPopulate)
            .lean();
          // Rank by how many services/industries/product types they share with this project.
          const shared = (o: Doc) =>
            (["services", "industries", "product_types"] as const).reduce(
              (n, f) => n + sids(o[f]).filter((x) => sids(project[f]).includes(x)).length,
              0,
            );
          const ranked = others.map((o, i) => ({ o, score: shared(o), i })).sort((a, b) => b.score - a.score || a.i - b.i);
          const items = ranked.slice(0, 4).map((r) => r.o);
          const ctx = await SerializeContext.build(items.flatMap((p) => [p.thumbnail_image, p.cover_image]));
          res.json(items.map((p) => publicProjectList(p, ctx)));
        });
      },
    }),
  );
}

export function portfolioManageRoutes(manage: Router) {
  manage.use(
    "/product-types",
    manageRouter({
      path: "product-types",
      model: ProductType,
      auditName: "ProductType",
      guard: requireContentEditor,
      schema: productTypeSchema,
      search: ["name"],
      filters: { bool: ["is_active"] },
      sort: { order: 1, name: 1 },
      orderable: true,
      tags: ["taxonomies", "projects", "forms"],
      extras: (docs) => usageCounts("product_types", docs),
      serialize: (t, ctx) => ({
        id: sid(t._id),
        ...pick(t, ["name", "slug", "description", "icon_key", "order", "is_active"]),
        projects_count: ctx.extra(t._id).projects_count ?? 0,
        updated_at: t.updated_at,
      }),
      afterDelete: async (t) => {
        await Promise.all([
          Project.updateMany({ product_types: t._id }, { $pull: { product_types: t._id } }),
          Inquiry.updateMany({ product_type: t._id }, { $set: { product_type: null } }),
        ]);
      },
    }),
  );

  manage.use(
    "/technologies",
    manageRouter({
      path: "technologies",
      model: Technology,
      auditName: "Technology",
      guard: requireContentEditor,
      schema: technologySchema,
      search: ["name", "category"],
      filters: { bool: ["is_active"], eq: ["category"] },
      sort: { order: 1, name: 1 },
      orderable: true,
      tags: ["taxonomies", "projects"],
      extras: (docs) => usageCounts("technologies", docs),
      serialize: (t, ctx) => ({
        id: sid(t._id),
        ...pick(t, ["name", "slug", "category"]),
        icon: sid(t.icon),
        ...pick(t, ["order", "is_active"]),
        projects_count: ctx.extra(t._id).projects_count ?? 0,
        updated_at: t.updated_at,
      }),
      prepare: async (data) => void (await assertMediaExist(data, ["icon"])),
      afterDelete: async (t) => {
        await Project.updateMany({ technologies: t._id }, { $pull: { technologies: t._id } });
      },
    }),
  );

  manage.use(
    "/projects",
    manageRouter({
      path: "projects",
      model: Project,
      auditName: "Project",
      guard: requireContentEditor,
      schema: projectSchema,
      mediaFields: ["cover_image", "thumbnail_image"],
      baseFilter: async (req) => {
        const publication = qs(req, "publication_status");
        const delivery = qs(req, "delivery_status");
        const tagFilter = await projectListFilter(req);
        return { $and: [tagFilter, { ...(publication ? { publication_status: publication } : {}), ...(delivery ? { delivery_status: delivery } : {}) }] };
      },
      sort: { order: 1, created_at: -1 },
      sortable: ["order", "updated_at", "title", "published_at"],
      orderable: true,
      tags: ["projects", "industries"],
      extras: projectManageExtras,
      serialize: manageProject,
      prepare: async (data, { existing }) => {
        const min = data.budget_min !== undefined ? data.budget_min : (existing?.budget_min ?? null);
        const max = data.budget_max !== undefined ? data.budget_max : (existing?.budget_max ?? null);
        if (min != null && max != null && min > max) throw ApiError.fieldError("budget_max", "Maximum budget must be ≥ minimum budget.");
        await assertMediaExist(data, ["cover_image", "thumbnail_image", "client_logo"]);
        await Promise.all([
          assertRefsExist(Service, data, "services", "service"),
          assertRefsExist(Industry, data, "industries", "industry"),
          assertRefsExist(ProductType, data, "product_types", "product type"),
          assertRefsExist(Technology, data, "technologies", "technology"),
        ]);
      },
      afterDelete: async (p) => {
        await Promise.all([
          ProjectGalleryItem.deleteMany({ project: p._id }),
          Testimonial.updateMany({ project: p._id }, { $set: { project: null } }),
          Inquiry.updateMany({ project_reference: p._id }, { $set: { project_reference: null } }),
        ]);
      },
    }),
  );

  manage.use(
    "/project-gallery",
    manageRouter({
      path: "project-gallery",
      model: ProjectGalleryItem,
      auditName: "ProjectGalleryItem",
      guard: requireContentEditor,
      schema: gallerySchema,
      mediaFields: ["media_asset"],
      filters: { ref: ["project"], eq: ["kind"] },
      sort: { order: 1, created_at: 1 },
      paginate: false,
      orderable: true,
      tags: ["projects"],
      serialize: manageGalleryItem,
      prepare: async (data) => {
        await assertMediaExist(data, ["media_asset"]);
        await assertRefsExist(Project, data, "project", "project");
      },
    }),
  );
}
