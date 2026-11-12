import { Router } from "express";
import { ApiError } from "../../errors/api-error.js";
import { resolveBlockMedia, validateBlocks } from "../../lib/blocks.js";
import { manageRouter } from "../../lib/crud.js";
import { publicRouter } from "../../lib/public.js";
import { qs, qsBool } from "../../lib/query.js";
import { assertMediaExist, assertRefsExist } from "../../lib/refs.js";
import { triggerRevalidate } from "../../lib/revalidate.js";
import { SerializeContext, pick, sid, type Doc } from "../../lib/serialize.js";
import { requireContentEditor } from "../../middleware/auth.js";
import { logAudit } from "../audit/audit.service.js";
import { Industry } from "../industries/industries.model.js";
import { MediaAsset } from "../media/media.model.js";
import { loadMediaMap } from "../media/media.service.js";
import { Post, publicPostFilter } from "../blog/blog.model.js";
import { Project, ProductType } from "../portfolio/portfolio.model.js";
import { Service } from "../services/services.model.js";
import {
  CMSPage, CMSSection, CredibilityItem, FAQ, FormOption, LegalPage, NavigationItem, PricingPlan, ProcessStep, SiteProfile,
  SiteSetting, SocialLink, TeamMember, Testimonial, CLAIM_KINDS, FORM_KINDS, NAV_LOCATIONS, loadProfile, SECTION_TYPES,
} from "./cms.model.js";
import {
  credibilitySchema, faqSchema, formOptionSchema, legalSchema, navigationSchema, pageSchema, pricingSchema, processSchema,
  profileSchema, sectionSchema, settingSchema, socialSchema, teamSchema, testimonialSchema,
} from "./cms.validation.js";
import {
  SECTION_SCHEMAS, SECTION_TYPE_LABELS, collectMediaIds, schemaDescription, styleSchemaDescription, validateSectionContent, validateStyle,
} from "./section-schemas.js";

const two = (n: unknown) => (n === null || n === undefined ? null : Number(n).toFixed(2));

// ---- public serializers --------------------------------------------------------------------------------
const PROFILE_FIELDS = [
  "agency_name", "short_name", "tagline", "description", "email", "support_email", "phone", "whatsapp", "address", "city",
  "country", "office_hours", "timezone_label", "availability_label", "accent", "animations_enabled", "default_meta_title",
  "default_meta_description", "footer_note", "privacy_notice", "updated_at",
] as const;

function publicProfile(p: Doc, ctx: SerializeContext) {
  return {
    ...pick(p, PROFILE_FIELDS.slice(0, 14)),
    logo: ctx.media(p.logo),
    logo_on_dark: ctx.media(p.logo_on_dark),
    favicon: ctx.media(p.favicon),
    ...pick(p, PROFILE_FIELDS.slice(14, 17)),
    og_image: ctx.media(p.og_image),
    ...pick(p, PROFILE_FIELDS.slice(17)),
  };
}

type NavNode = Doc & { children?: NavNode[] };
function publicNav(item: NavNode): Record<string, unknown> {
  const kids = (item.children ?? []).filter((c) => c.is_visible).sort((a, b) => a.order - b.order);
  return {
    id: sid(item._id),
    ...pick(item, ["label", "url", "description", "icon_key", "badge", "open_in_new_tab", "is_cta"]),
    children: kids.map(publicNav),
  };
}

/** A published page with its active sections; media ids inside section content are resolved to image objects. */
export async function buildPublicPage(page: Doc) {
  const sections = (await CMSSection.find({ page: page._id, is_active: true }).sort({ order: 1, created_at: 1 }).lean()) as Doc[];
  const mediaIds = [page.og_image, ...sections.flatMap((s) => collectMediaIds(s.section_type, s.content_data))];
  const media = await loadMediaMap(mediaIds);
  return {
    ...pick(page, ["slug", "title", "meta_title", "meta_description"]),
    og_image: media.get(String(page.og_image)) ?? null,
    sections: sections.map((s) => {
      const content: Record<string, unknown> = { ...(s.content_data ?? {}) };
      for (const [key, spec] of Object.entries(SECTION_SCHEMAS[s.section_type]?.fields ?? {})) {
        const v = content[key];
        if (spec.t === "media" && typeof v === "string" && media.has(v)) content[key] = media.get(v);
        else if (spec.t === "media_list" && Array.isArray(v)) content[key] = v.map((id) => media.get(String(id))).filter(Boolean);
      }
      return {
        id: sid(s._id),
        ...pick(s, ["section_type", "variant", "label", "headline", "subheadline"]),
        content,
        style: s.style ?? {},
        animation: {
          enabled: s.animation_enabled && s.animation_preset !== "none",
          preset: s.animation_preset,
          duration: Number(s.animation_duration),
          delay: Number(s.animation_delay),
        },
        order: s.order,
      };
    }),
    updated_at: page.updated_at,
  };
}

const publicFaq = (f: Doc) => ({ id: sid(f._id), ...pick(f, ["question", "answer", "category"]), service: f.service?.slug ?? null });
const publicTestimonial = (t: Doc, ctx: SerializeContext) => ({
  id: sid(t._id),
  ...pick(t, ["client_name", "client_role", "company_name", "content", "metric_value", "metric_label", "rating"]),
  avatar: ctx.media(t.avatar),
  project: t.project && t.project.publication_status === "Published" ? { title: t.project.title, slug: t.project.slug } : null,
  is_featured: t.is_featured,
});

export async function publicLegal(l: Doc) {
  return { ...pick(l, ["slug", "title", "summary"]), body: await resolveBlockMedia(l.body), last_reviewed: l.last_reviewed ? new Date(l.last_reviewed).toISOString().slice(0, 10) : null, ...pick(l, ["meta_title", "meta_description", "updated_at"]) };
}

// ---- public routes -------------------------------------------------------------------------------------
export function cmsPublicRoutes(api: Router) {
  api.get("/site", async (_req, res) => {
    const [profile, nav, socials, legal, hasPosts, hasPricing, hasTestimonials, hasTeam] = await Promise.all([
      loadProfile().then((p) => p.toObject() as Doc),
      NavigationItem.find({ is_visible: true }).sort({ order: 1 }).lean() as Promise<Doc[]>,
      SocialLink.find({ is_visible: true }).sort({ order: 1 }).lean(),
      LegalPage.find({ status: "published" }).sort({ title: 1 }).select("slug title").lean(),
      Post.exists(publicPostFilter()),
      PricingPlan.exists({ is_published: true }),
      Testimonial.exists({ is_published: true, is_verified: true }),
      TeamMember.exists({ is_published: true }),
    ]);
    const children = (id: unknown) => nav.filter((n) => String(n.parent) === String(id));
    const grouped: Record<string, Record<string, unknown>[]> = Object.fromEntries(NAV_LOCATIONS.map((l) => [l, []]));
    for (const n of nav.filter((x) => !x.parent)) grouped[n.location]!.push(publicNav({ ...n, children: children(n._id) }));
    const ctx = await SerializeContext.build([profile.logo, profile.logo_on_dark, profile.favicon, profile.og_image]);
    res.json({
      profile: publicProfile(profile, ctx),
      navigation: grouped,
      socials: socials.map((s) => ({ id: sid(s._id), ...pick(s, ["platform", "label", "url"]) })),
      legal_pages: legal.map((l) => ({ slug: l.slug, title: l.title })),
      availability: { blog: !!hasPosts, pricing: !!hasPricing, testimonials: !!hasTestimonials, team: !!hasTeam },
    });
  });

  api.get("/pages/:slug", async (req, res) => {
    const page = await CMSPage.findOne({ slug: String(req.params.slug), is_published: true }).lean();
    if (!page) throw ApiError.notFound();
    res.json(await buildPublicPage(page));
  });

  api.get("/forms/options", async (_req, res) => {
    const [options, services, industries, productTypes] = await Promise.all([
      FormOption.find({ is_active: true }).sort({ kind: 1, order: 1, label: 1 }).lean(),
      Service.find({ is_active: true }).sort({ order: 1 }).select("slug title").lean(),
      Industry.find({ is_active: true }).sort({ order: 1 }).select("slug name").lean(),
      ProductType.find({ is_active: true }).sort({ order: 1 }).select("slug name").lean(),
    ]);
    const grouped: Record<string, { value: string; label: string }[]> = Object.fromEntries(FORM_KINDS.map((k) => [k, []]));
    for (const o of options) grouped[o.kind]!.push({ value: o.value, label: o.label });
    res.json({
      options: grouped,
      services: services.map((s) => ({ slug: s.slug, title: s.title })),
      industries: industries.map((i) => ({ slug: i.slug, name: i.name })),
      product_types: productTypes.map((p) => ({ slug: p.slug, name: p.name })),
    });
  });

  api.use(
    "/faqs",
    publicRouter({
      model: FAQ,
      filter: () => ({ is_published: true }),
      listFilter: async (req) => {
        const clauses: Doc[] = [];
        if (qsBool(req, "home") === true) clauses.push({ show_on_home: true });
        const service = qs(req, "service");
        if (service) clauses.push({ service: { $in: (await Service.find({ slug: service }, "_id").lean()).map((s) => s._id) } });
        const category = qs(req, "category");
        if (category) clauses.push({ category: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
        return clauses.length ? { $and: clauses } : {};
      },
      sort: { order: 1, question: 1 },
      populate: [{ path: "service", select: "slug" }],
      serializeList: publicFaq,
    }),
  );
  api.use(
    "/testimonials",
    publicRouter({
      model: Testimonial,
      filter: () => ({ is_published: true, is_verified: true }),
      sort: { order: 1, created_at: -1 },
      populate: [{ path: "project", select: "title slug publication_status" }],
      mediaFields: ["avatar"],
      serializeList: publicTestimonial,
    }),
  );
  api.use(
    "/team",
    publicRouter({
      model: TeamMember,
      filter: () => ({ is_published: true }),
      sort: { order: 1 },
      mediaFields: ["avatar"],
      serializeList: (m, ctx) => ({ id: sid(m._id), ...pick(m, ["full_name", "role_title", "bio"]), avatar: ctx.media(m.avatar), linkedin_url: m.linkedin_url }),
    }),
  );
  api.use(
    "/pricing",
    publicRouter({
      model: PricingPlan,
      filter: () => ({ is_published: true }),
      sort: { order: 1 },
      serializeList: (p) => ({
        id: sid(p._id),
        ...pick(p, ["name", "slug", "description"]),
        price_amount: two(p.price_amount),
        ...pick(p, ["currency", "price_prefix", "billing", "badge", "features", "icon_key", "cta_label", "cta_url", "variant"]),
      }),
    }),
  );
  api.use(
    "/process",
    publicRouter({
      model: ProcessStep,
      filter: () => ({ is_published: true }),
      sort: { order: 1 },
      mediaFields: ["image"],
      serializeList: (s, ctx) => ({ id: sid(s._id), ...pick(s, ["title", "description", "icon_key"]), image: ctx.media(s.image), deliverables: s.deliverables, order: s.order }),
    }),
  );
  api.use(
    "/credibility",
    publicRouter({
      model: CredibilityItem,
      // Claims (statistics, awards, client logos) need BOTH verified and published.
      filter: () => ({ is_published: true, $or: [{ kind: "capability" }, { is_verified: true }] }),
      sort: { kind: 1, order: 1 },
      mediaFields: ["logo"],
      serializeList: (c, ctx) => ({ id: sid(c._id), ...pick(c, ["kind", "value", "title", "description", "icon_key"]), logo: ctx.media(c.logo), link_url: c.link_url }),
    }),
  );

  api.get("/legal", async (_req, res) => {
    const pages = (await LegalPage.find({ status: "published" }).sort({ title: 1 }).lean()) as Doc[];
    res.json(await Promise.all(pages.map(publicLegal)));
  });
  api.get("/legal/:slug", async (req, res) => {
    const page = await LegalPage.findOne({ slug: String(req.params.slug), status: "published" }).lean();
    if (!page) throw ApiError.notFound();
    res.json(await publicLegal(page));
  });
}

// ---- management ----------------------------------------------------------------------------------------
const publishRequiresVerified = (what: string) => (data: Doc, existing: Doc | null) => {
  const published = data.is_published ?? existing?.is_published ?? false;
  const verified = data.is_verified ?? existing?.is_verified ?? false;
  if (published && !verified) throw ApiError.fieldError("is_published", what);
};

export function cmsManageRoutes(manage: Router) {
  // Singleton site profile ---------------------------------------------------------------------------------
  const profileOut = async (p: Doc) => {
    const ctx = await SerializeContext.build([p.logo, p.logo_on_dark, p.favicon, p.og_image]);
    return {
      id: 1,
      ...pick(p, PROFILE_FIELDS.slice(0, 14)),
      logo: sid(p.logo), logo_detail: ctx.media(p.logo),
      logo_on_dark: sid(p.logo_on_dark), logo_on_dark_detail: ctx.media(p.logo_on_dark),
      favicon: sid(p.favicon), favicon_detail: ctx.media(p.favicon),
      ...pick(p, ["accent", "animations_enabled", "default_meta_title", "default_meta_description"]),
      og_image: sid(p.og_image), og_image_detail: ctx.media(p.og_image),
      ...pick(p, ["footer_note", "privacy_notice", "updated_at"]),
    };
  };
  manage.get("/site-profile", requireContentEditor, async (_req, res) => {
    res.json(await profileOut((await loadProfile()).toObject()));
  });
  manage.patch("/site-profile", requireContentEditor, async (req, res) => {
    const data = profileSchema.partial().parse(req.body ?? {}) as Doc;
    await assertMediaExist(data, ["logo", "logo_on_dark", "favicon", "og_image"]);
    if (data.favicon) {
      const asset = await MediaAsset.findById(data.favicon).lean();
      if (asset && !["image/png", "image/svg+xml"].includes(asset.mime_type)) throw ApiError.fieldError("favicon", "Favicons must be PNG or SVG.");
    }
    const profile = await loadProfile();
    profile.set(data);
    await profile.save();
    await logAudit({ req, action: "update", target_model: "SiteProfile", target_id: 1, details: { fields: Object.keys(data).sort() } });
    triggerRevalidate(["site", "cms", "forms"]);
    res.json(await profileOut(profile.toObject()));
  });

  manage.get("/section-schemas", requireContentEditor, (_req, res) => {
    res.json({
      schemas: schemaDescription(),
      style_schema: styleSchemaDescription(),
      section_types: SECTION_TYPES.map((value) => ({ value, label: SECTION_TYPE_LABELS[value] })),
      animation_presets: [
        { value: "fade_up", label: "Fade up" }, { value: "fade", label: "Fade" }, { value: "scale", label: "Scale in" }, { value: "none", label: "None" },
      ],
    });
  });

  manage.use(
    "/settings",
    manageRouter({
      path: "settings",
      model: SiteSetting,
      auditName: "SiteSetting",
      guard: requireContentEditor,
      schema: settingSchema,
      lookup: "key",
      sort: { group: 1, key: 1 },
      paginate: false,
      tags: ["site"],
      serialize: (s) => pick(s, ["key", "value", "group", "description", "is_public", "updated_at"]),
    }),
  );

  manage.use(
    "/pages",
    manageRouter({
      path: "pages",
      model: CMSPage,
      auditName: "CMSPage",
      guard: requireContentEditor,
      schema: pageSchema,
      lookup: "slug",
      mediaFields: ["og_image"],
      sort: { title: 1 },
      paginate: false,
      tags: ["cms"],
      extras: async (docs) => {
        const rows = await CMSSection.aggregate([{ $match: { page: { $in: docs.map((d) => d._id) } } }, { $group: { _id: "$page", n: { $sum: 1 } } }]);
        return Object.fromEntries(docs.map((d) => [String(d._id), { sections_count: rows.find((r) => String(r._id) === String(d._id))?.n ?? 0 }]));
      },
      serialize: (p, ctx) => ({
        id: sid(p._id),
        ...pick(p, ["slug", "title", "meta_title", "meta_description"]),
        og_image: sid(p.og_image),
        is_published: p.is_published,
        sections_count: ctx.extra(p._id).sections_count ?? 0,
        updated_at: p.updated_at,
      }),
      prepare: async (data) => void (await assertMediaExist(data, ["og_image"])),
      afterDelete: async (p) => void (await CMSSection.deleteMany({ page: p._id })),
    }),
  );

  manage.use(
    "/sections",
    manageRouter({
      path: "sections",
      model: CMSSection,
      auditName: "CMSSection",
      guard: requireContentEditor,
      schema: sectionSchema,
      filters: { ref: ["page"], eq: ["section_type"], bool: ["is_active"] },
      baseFilter: async (req) => {
        const slug = qs(req, "page_slug");
        if (!slug) return {};
        const page = await CMSPage.findOne({ slug }, "_id").lean();
        return { page: page?._id ?? null };
      },
      sort: { order: 1, created_at: 1 },
      paginate: false,
      orderable: true,
      tags: ["cms"],
      serialize: (s) => ({
        id: sid(s._id),
        page: sid(s.page),
        ...pick(s, ["section_type", "variant", "label", "headline", "subheadline"]),
        content_data: s.content_data ?? {},
        style: s.style ?? {},
        ...pick(s, ["order", "is_active", "animation_enabled", "animation_preset"]),
        animation_duration: two(s.animation_duration),
        animation_delay: two(s.animation_delay),
        updated_at: s.updated_at,
      }),
      prepare: async (data, { existing }) => {
        const type = (data.section_type ?? existing?.section_type) as string;
        const schema = SECTION_SCHEMAS[type];
        if (data.page) await assertRefsExist(CMSPage, data, "page", "page");
        let variant = (data.variant ?? existing?.variant ?? "default") as string;
        // A section type that does not offer the default layout falls back to its first variant.
        if (schema && data.variant === undefined && !schema.variants.includes(variant)) {
          variant = schema.variants[0]!;
          data.variant = variant;
        }
        data.content_data = await validateSectionContent(type, variant, data.content_data ?? existing?.content_data ?? {});
        data.style = validateStyle(type, data.style ?? existing?.style ?? {});
        data.media_ids = collectMediaIds(type, data.content_data as Record<string, unknown>);
        return data;
      },
    }),
  );

  manage.use(
    "/faqs",
    manageRouter({
      path: "faqs",
      model: FAQ,
      auditName: "FAQ",
      guard: requireContentEditor,
      schema: faqSchema,
      populate: [{ path: "service", select: "title" }],
      search: ["question", "answer"],
      filters: { bool: ["is_published", "show_on_home"], ref: ["service"] },
      sort: { order: 1 },
      paginate: false,
      orderable: true,
      tags: ["faqs", "services"],
      serialize: (f) => ({
        id: sid(f._id),
        ...pick(f, ["question", "answer", "category"]),
        service: sid(f.service),
        service_title: f.service?.title ?? null,
        ...pick(f, ["show_on_home", "order", "is_published", "updated_at"]),
      }),
      prepare: async (data) => void (await assertRefsExist(Service, data, "service", "service")),
    }),
  );

  manage.use(
    "/testimonials",
    manageRouter({
      path: "testimonials",
      model: Testimonial,
      auditName: "Testimonial",
      guard: requireContentEditor,
      schema: testimonialSchema,
      populate: [{ path: "project", select: "title" }],
      mediaFields: ["avatar"],
      search: ["client_name", "company_name"],
      filters: { bool: ["is_published", "is_verified"] },
      sort: { order: 1 },
      paginate: false,
      orderable: true,
      tags: ["testimonials", "projects"],
      serialize: (t, ctx) => ({
        id: sid(t._id),
        ...pick(t, ["client_name", "client_role", "company_name", "content", "metric_value", "metric_label"]),
        project: sid(t.project),
        project_title: t.project?.title ?? null,
        rating: t.rating,
        avatar: sid(t.avatar),
        avatar_detail: ctx.media(t.avatar),
        ...pick(t, ["evidence_note", "is_featured", "is_verified", "is_published", "order", "updated_at"]),
      }),
      prepare: async (data, { existing }) => {
        publishRequiresVerified("Mark the testimonial as verified before publishing it.")(data, existing);
        await assertMediaExist(data, ["avatar"]);
        await assertRefsExist(Project, data, "project", "project");
      },
    }),
  );

  manage.use(
    "/team",
    manageRouter({
      path: "team",
      model: TeamMember,
      auditName: "TeamMember",
      guard: requireContentEditor,
      schema: teamSchema,
      mediaFields: ["avatar"],
      search: ["full_name", "role_title"],
      filters: { bool: ["is_published"] },
      sort: { order: 1 },
      paginate: false,
      orderable: true,
      tags: ["team"],
      serialize: (m, ctx) => ({
        id: sid(m._id),
        ...pick(m, ["full_name", "role_title", "bio"]),
        avatar: sid(m.avatar),
        avatar_detail: ctx.media(m.avatar),
        ...pick(m, ["linkedin_url", "order", "is_published", "updated_at"]),
      }),
      prepare: async (data) => void (await assertMediaExist(data, ["avatar"])),
    }),
  );

  manage.use(
    "/pricing",
    manageRouter({
      path: "pricing",
      model: PricingPlan,
      auditName: "PricingPlan",
      guard: requireContentEditor,
      schema: pricingSchema,
      filters: { bool: ["is_published"] },
      sort: { order: 1 },
      paginate: false,
      orderable: true,
      tags: ["pricing"],
      serialize: (p) => ({
        id: sid(p._id),
        ...pick(p, ["name", "slug", "description"]),
        price_amount: two(p.price_amount),
        ...pick(p, ["currency", "price_prefix", "billing", "badge", "features", "icon_key", "cta_label", "cta_url", "variant", "order", "is_published", "updated_at"]),
      }),
    }),
  );

  manage.use(
    "/process",
    manageRouter({
      path: "process",
      model: ProcessStep,
      auditName: "ProcessStep",
      guard: requireContentEditor,
      schema: processSchema,
      mediaFields: ["image"],
      filters: { bool: ["is_published"] },
      sort: { order: 1 },
      paginate: false,
      orderable: true,
      tags: ["process"],
      serialize: (s, ctx) => ({
        id: sid(s._id),
        ...pick(s, ["title", "description", "icon_key"]),
        image: sid(s.image),
        image_detail: ctx.media(s.image),
        ...pick(s, ["deliverables", "order", "is_published", "updated_at"]),
      }),
      prepare: async (data) => void (await assertMediaExist(data, ["image"])),
    }),
  );

  manage.use(
    "/credibility",
    manageRouter({
      path: "credibility",
      model: CredibilityItem,
      auditName: "CredibilityItem",
      guard: requireContentEditor,
      schema: credibilitySchema,
      mediaFields: ["logo"],
      filters: { eq: ["kind"], bool: ["is_published", "is_verified"] },
      sort: { kind: 1, order: 1 },
      paginate: false,
      orderable: true,
      tags: ["credibility"],
      serialize: (c, ctx) => ({
        id: sid(c._id),
        ...pick(c, ["kind", "value", "title", "description", "icon_key"]),
        logo: sid(c.logo),
        logo_detail: ctx.media(c.logo),
        ...pick(c, ["link_url", "evidence_note", "is_verified", "is_published", "order", "updated_at"]),
      }),
      prepare: async (data, { existing }) => {
        const kind = (data.kind ?? existing?.kind ?? "capability") as (typeof CLAIM_KINDS)[number];
        const published = data.is_published ?? existing?.is_published ?? false;
        const verified = data.is_verified ?? existing?.is_verified ?? false;
        if ((CLAIM_KINDS as readonly string[]).includes(kind) && published && !verified) {
          throw ApiError.fieldError("is_published", "Statistics, awards and client logos must be verified before publishing.");
        }
        await assertMediaExist(data, ["logo"]);
      },
    }),
  );

  manage.use(
    "/navigation",
    manageRouter({
      path: "navigation",
      model: NavigationItem,
      auditName: "NavigationItem",
      guard: requireContentEditor,
      schema: navigationSchema,
      filters: { eq: ["location"], bool: ["is_visible"] },
      sort: { location: 1, order: 1 },
      paginate: false,
      orderable: true,
      tags: ["site"],
      serialize: (n) => ({ id: sid(n._id), ...pick(n, ["location"]), parent: sid(n.parent), ...pick(n, ["label", "url", "description", "icon_key", "badge", "open_in_new_tab", "is_cta", "order", "is_visible", "updated_at"]) }),
      prepare: async (data, { existing }) => {
        const parentId = data.parent !== undefined ? data.parent : (existing?.parent ?? null);
        const location = data.location ?? existing?.location;
        if (!parentId) return;
        const parent = await NavigationItem.findById(parentId).lean();
        if (!parent) throw ApiError.fieldError("parent", "The selected parent does not exist.");
        if (location !== "header" || parent.location !== "header") throw ApiError.fieldError("parent", "Only header items can be nested.");
        if (parent.parent) throw ApiError.fieldError("parent", "Only one level of nesting is supported.");
        if (existing && String(parent._id) === String(existing._id)) throw ApiError.fieldError("parent", "An item cannot be its own parent.");
      },
      afterDelete: async (n) => void (await NavigationItem.deleteMany({ parent: n._id })),
    }),
  );

  manage.use(
    "/socials",
    manageRouter({
      path: "socials",
      model: SocialLink,
      auditName: "SocialLink",
      guard: requireContentEditor,
      schema: socialSchema,
      sort: { order: 1 },
      paginate: false,
      orderable: true,
      tags: ["site"],
      serialize: (s) => ({ id: sid(s._id), ...pick(s, ["platform", "label", "url", "order", "is_visible", "updated_at"]) }),
    }),
  );

  manage.use(
    "/legal",
    manageRouter({
      path: "legal",
      model: LegalPage,
      auditName: "LegalPage",
      guard: requireContentEditor,
      schema: legalSchema,
      filters: { eq: ["status"] },
      sort: { title: 1 },
      paginate: false,
      tags: ["legal", "site"],
      serialize: (l) => ({
        id: sid(l._id),
        ...pick(l, ["slug", "title", "summary", "body", "status"]),
        last_reviewed: l.last_reviewed ? new Date(l.last_reviewed).toISOString().slice(0, 10) : null,
        ...pick(l, ["meta_title", "meta_description", "updated_at"]),
      }),
      prepare: async (data) => {
        if (data.body !== undefined) data.body = await validateBlocks(data.body, "body");
      },
    }),
  );

  manage.use(
    "/form-options",
    manageRouter({
      path: "form-options",
      model: FormOption,
      auditName: "FormOption",
      guard: requireContentEditor,
      schema: formOptionSchema,
      filters: { eq: ["kind"], bool: ["is_active"] },
      sort: { kind: 1, order: 1 },
      paginate: false,
      orderable: true,
      tags: ["forms"],
      serialize: (o) => ({ id: sid(o._id), ...pick(o, ["kind", "value", "label", "order", "is_active", "updated_at"]) }),
    }),
  );
}

export { SiteProfile };
