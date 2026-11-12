import { Router } from "express";
import { manageRouter } from "../../lib/crud.js";
import { publicRouter } from "../../lib/public.js";
import { pick, sid, type Doc, type SerializeContext } from "../../lib/serialize.js";
import { qsBool } from "../../lib/query.js";
import { assertMediaExist, assertRefsExist } from "../../lib/refs.js";
import { requireContentEditor } from "../../middleware/auth.js";
import { FAQ } from "../cms/cms.model.js";
import { Inquiry } from "../inquiries/inquiries.model.js";
import { Project } from "../portfolio/portfolio.model.js";
import { Service, ServiceCategory } from "./services.model.js";
import { categorySchema, serviceSchema } from "./services.validation.js";

// ---- serializers ---------------------------------------------------------------------------------
const publicCategory = (c: Doc) => ({ id: sid(c._id), name: c.name, slug: c.slug, description: c.description });

function publicService(s: Doc, ctx: SerializeContext) {
  const caps = [...(s.capabilities ?? [])].sort((a: Doc, b: Doc) => a.order - b.order);
  return {
    id: sid(s._id),
    title: s.title,
    slug: s.slug,
    tagline: s.tagline,
    short_description: s.short_description,
    icon_key: s.icon_key,
    category: s.category && typeof s.category === "object" && "name" in s.category ? publicCategory(s.category) : null,
    cover_image: ctx.media(s.cover_image),
    capabilities: caps.map((c: Doc) => ({ id: sid(c._id), title: c.title, description: c.description })),
    is_featured: s.is_featured,
    order: s.order,
  };
}

export const publicServiceDetail = (s: Doc, ctx: SerializeContext) => ({
  ...publicService(s, ctx),
  ...pick(s, ["full_content", "deliverables", "meta_title", "meta_description", "updated_at"]),
});

function manageService(s: Doc, ctx: SerializeContext) {
  const caps = [...(s.capabilities ?? [])].sort((a: Doc, b: Doc) => a.order - b.order);
  return {
    id: sid(s._id),
    category: sid(s.category),
    category_name: s.category?.name ?? null,
    ...pick(s, ["title", "slug", "tagline", "short_description", "full_content", "icon_key", "deliverables"]),
    cover_image: sid(s.cover_image),
    cover_image_detail: ctx.media(s.cover_image),
    icon_image: sid(s.icon_image),
    ...pick(s, ["is_featured", "meta_title", "meta_description", "order", "is_active"]),
    capabilities: caps.map((c: Doc) => ({ id: sid(c._id), service: sid(s._id), title: c.title, description: c.description, order: c.order })),
    ...pick(s, ["created_at", "updated_at"]),
  };
}

// ---- routers -------------------------------------------------------------------------------------
export function servicesPublicRoutes(api: Router) {
  api.use(
    "/service-categories",
    publicRouter({
      model: ServiceCategory,
      filter: () => ({ is_active: true }),
      sort: { order: 1, name: 1 },
      lookup: "slug",
      serializeList: publicCategory,
    }),
  );
  api.use(
    "/services",
    publicRouter({
      model: Service,
      filter: () => ({ is_active: true }),
      listFilter: (req) => (qsBool(req, "featured") === true ? { is_featured: true } : {}),
      sort: { order: 1, title: 1 },
      populate: ["category"],
      mediaFields: ["cover_image"],
      lookup: "slug",
      serializeList: publicService,
      serializeDetail: publicServiceDetail,
    }),
  );
}

export function servicesManageRoutes(manage: Router) {
  manage.use(
    "/service-categories",
    manageRouter({
      path: "service-categories",
      model: ServiceCategory,
      auditName: "ServiceCategory",
      guard: requireContentEditor,
      schema: categorySchema,
      search: ["name"],
      filters: { bool: ["is_active"] },
      sort: { order: 1, name: 1 },
      orderable: true,
      tags: ["services"],
      extras: async (docs) => {
        const rows = await Service.aggregate([{ $match: { category: { $in: docs.map((d) => d._id) } } }, { $group: { _id: "$category", n: { $sum: 1 } } }]);
        return Object.fromEntries(docs.map((d) => [String(d._id), { services_count: rows.find((r) => String(r._id) === String(d._id))?.n ?? 0 }]));
      },
      serialize: (c, ctx) => ({
        id: sid(c._id),
        ...pick(c, ["name", "slug", "description", "order", "is_active"]),
        services_count: ctx.extra(c._id).services_count ?? 0,
        updated_at: c.updated_at,
      }),
      afterDelete: async (c) => {
        await Service.updateMany({ category: c._id }, { $set: { category: null } });
      },
    }),
  );

  manage.use(
    "/services",
    manageRouter({
      path: "services",
      model: Service,
      auditName: "Service",
      guard: requireContentEditor,
      schema: serviceSchema,
      populate: ["category"],
      mediaFields: ["cover_image"],
      search: ["title", "tagline", "short_description"],
      filters: { bool: ["is_active", "is_featured"], ref: ["category"] },
      sort: { order: 1, title: 1 },
      orderable: true,
      tags: ["services", "forms"],
      serialize: manageService,
      prepare: async (data) => {
        await assertMediaExist(data, ["cover_image", "icon_image"]);
        await assertRefsExist(ServiceCategory, data, "category", "category");
        const titles = data.capability_titles as string[] | undefined;
        delete data.capability_titles;
        if (titles) data.capabilities = titles.map((title, order) => ({ title, description: "", order }));
        return data;
      },
      afterDelete: async (s) => {
        // Deleting a service must not leave dangling references behind.
        await Promise.all([
          Project.updateMany({ services: s._id }, { $pull: { services: s._id } }),
          FAQ.updateMany({ service: s._id }, { $set: { service: null } }),
          Inquiry.updateMany({ service: s._id }, { $set: { service: null } }),
        ]);
      },
    }),
  );
}
