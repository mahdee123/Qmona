import { Router } from "express";
import { z } from "zod";
import { manageRouter } from "../../lib/crud.js";
import { publicRouter } from "../../lib/public.js";
import { assertMediaExist } from "../../lib/refs.js";
import { pick, sid, type Doc, type SerializeContext } from "../../lib/serialize.js";
import { iconKey, longText, optionalRef, order, requiredText, slug, stringList, text } from "../../lib/validators.js";
import { requireContentEditor } from "../../middleware/auth.js";
import { Inquiry } from "../inquiries/inquiries.model.js";
import { Project } from "../portfolio/portfolio.model.js";
import { Industry } from "./industries.model.js";

export const industrySchema = z.object({
  name: requiredText(100),
  slug: slug(120),
  description: longText(5000).optional(),
  overview: longText(20_000).optional(),
  focus_areas: stringList("focus areas").optional(),
  icon_key: iconKey.optional(),
  icon: optionalRef.optional(),
  cover_image: optionalRef.optional(),
  meta_title: text(160).optional(),
  meta_description: text(255).optional(),
  order: order.optional(),
  is_active: z.boolean().optional(),
});

/** Published projects per industry, loaded once for a whole list. */
async function projectCounts(ids: unknown[], publishedOnly: boolean): Promise<Map<string, number>> {
  const match: Record<string, unknown> = { industries: { $in: ids } };
  if (publishedOnly) match.publication_status = "Published";
  const rows = await Project.aggregate([{ $match: match }, { $unwind: "$industries" }, { $match: { industries: { $in: ids } } }, { $group: { _id: "$industries", n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n as number]));
}

function publicIndustry(i: Doc, ctx: SerializeContext) {
  return {
    id: sid(i._id),
    ...pick(i, ["name", "slug", "description", "icon_key"]),
    cover_image: ctx.media(i.cover_image),
    projects_count: ctx.extra(i._id).projects_count ?? 0,
    order: i.order,
  };
}

const publicIndustryDetail = (i: Doc, ctx: SerializeContext) => ({
  ...publicIndustry(i, ctx),
  ...pick(i, ["overview", "focus_areas", "meta_title", "meta_description"]),
});

export function industriesPublicRoutes(api: Router) {
  const extras = async (docs: Doc[]) => {
    const counts = await projectCounts(docs.map((d) => d._id), true);
    return Object.fromEntries(docs.map((d) => [String(d._id), { projects_count: counts.get(String(d._id)) ?? 0 }]));
  };
  api.use(
    "/industries",
    publicRouter({
      model: Industry,
      filter: () => ({ is_active: true }),
      sort: { order: 1, name: 1 },
      mediaFields: ["cover_image"],
      extras,
      lookup: "slug",
      serializeList: publicIndustry,
      serializeDetail: publicIndustryDetail,
    }),
  );
}

export function industriesManageRoutes(manage: Router) {
  manage.use(
    "/industries",
    manageRouter({
      path: "industries",
      model: Industry,
      auditName: "Industry",
      guard: requireContentEditor,
      schema: industrySchema,
      mediaFields: ["cover_image"],
      search: ["name", "description"],
      filters: { bool: ["is_active"] },
      sort: { order: 1, name: 1 },
      orderable: true,
      tags: ["industries", "taxonomies", "forms"],
      extras: async (docs) => {
        const counts = await projectCounts(docs.map((d) => d._id), false);
        return Object.fromEntries(docs.map((d) => [String(d._id), { projects_count: counts.get(String(d._id)) ?? 0 }]));
      },
      serialize: (i, ctx) => ({
        id: sid(i._id),
        ...pick(i, ["name", "slug", "description", "overview", "focus_areas", "icon_key"]),
        icon: sid(i.icon),
        cover_image: sid(i.cover_image),
        cover_image_detail: ctx.media(i.cover_image),
        ...pick(i, ["meta_title", "meta_description", "order", "is_active"]),
        projects_count: ctx.extra(i._id).projects_count ?? 0,
        updated_at: i.updated_at,
      }),
      prepare: async (data) => void (await assertMediaExist(data, ["icon", "cover_image"])),
      afterDelete: async (i) => {
        await Promise.all([
          Project.updateMany({ industries: i._id }, { $pull: { industries: i._id } }),
          Inquiry.updateMany({ industry: i._id }, { $set: { industry: null } }),
        ]);
      },
    }),
  );
}
