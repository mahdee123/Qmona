import { Router } from "express";
import { ApiError } from "../../errors/api-error.js";
import { SerializeContext, type Doc } from "../../lib/serialize.js";
import { requireAuth, requireContentEditor } from "../../middleware/auth.js";
import { isContentEditor, isInquiryManager } from "../user/user.interface.js";
import { Post } from "../blog/blog.model.js";
import { publicPostDetail } from "../blog/blog.router.js";
import { CMSPage, CredibilityItem, FAQ, LegalPage, PricingPlan, Testimonial, CLAIM_KINDS } from "../cms/cms.model.js";
import { buildPublicPage, publicLegal } from "../cms/cms.router.js";
import { Industry } from "../industries/industries.model.js";
import { Inquiry, OPEN_STATUSES } from "../inquiries/inquiries.model.js";
import { MediaAsset } from "../media/media.model.js";
import { Project } from "../portfolio/portfolio.model.js";
import { projectPopulate, projectPublicExtras, publicProjectDetail } from "../portfolio/portfolio.router.js";
import { Service } from "../services/services.model.js";
import { publicServiceDetail } from "../services/services.router.js";

export const dashboardRouter = Router();

/** Role-aware counts and recent activity for the admin dashboard (real database data). */
dashboardRouter.get("/dashboard", requireAuth, async (req, res) => {
  const user = req.user!;
  const data: Record<string, unknown> = { generated_at: new Date().toISOString() };

  if (isInquiryManager(user)) {
    const active = { is_archived: false };
    const open = { $in: [...OPEN_STATUSES] };
    const [byTypeStatus, unread, newCount, openContact, openSupport, mine, failed, last7, recent] = await Promise.all([
      Inquiry.aggregate([{ $match: active }, { $group: { _id: { t: "$inquiry_type", s: "$status" }, n: { $sum: 1 } } }]),
      Inquiry.countDocuments({ ...active, is_read: false, status: { $ne: "spam" } }),
      Inquiry.countDocuments({ ...active, status: "new" }),
      Inquiry.countDocuments({ ...active, inquiry_type: "contact", status: open }),
      Inquiry.countDocuments({ ...active, inquiry_type: "support", status: open }),
      Inquiry.countDocuments({ ...active, assigned_to: user.id, status: open }),
      Inquiry.countDocuments({ ...active, notification_status: "failed" }),
      Inquiry.countDocuments({ created_at: { $gte: new Date(Date.now() - 7 * 86_400_000) } }),
      Inquiry.find(active).sort({ created_at: -1 }).limit(8).populate("service", "title").populate("industry", "name").populate("assigned_to", "email username first_name last_name").lean(),
    ]);
    const counts: Record<string, Record<string, number>> = {};
    for (const r of byTypeStatus) (counts[r._id.t] ??= {})[r._id.s] = r.n;
    data.inquiries = {
      unread, new: newCount, open_contact: openContact, open_support: openSupport, assigned_to_me: mine, notification_failed: failed,
      last_7_days: last7, by_type_and_status: counts,
      recent: (recent as Doc[]).map((i) => ({
        id: String(i._id),
        reference: i.reference, inquiry_type: i.inquiry_type, full_name: i.full_name, email: i.email, company: i.company, topic: i.topic,
        subject: i.subject, support_category: i.support_category,
        service_title: i.service?.title ?? null, industry_name: i.industry?.name ?? null,
        status: i.status, is_read: i.is_read, is_archived: i.is_archived,
        assigned_to: i.assigned_to ? { id: String(i.assigned_to._id), email: i.assigned_to.email, name: `${i.assigned_to.first_name} ${i.assigned_to.last_name}`.trim() || i.assigned_to.username } : null,
        notification_status: i.notification_status, created_at: i.created_at,
      })),
    };
  }

  if (isContentEditor(user)) {
    const group = async (model: typeof Project | typeof Post, field: string) => {
      const rows = await (model as typeof Project).aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
      return Object.fromEntries(rows.map((r) => [r._id, r.n]));
    };
    const [projects, posts, servicesActive, industriesActive, faqs, pending, published, pricing, claims, media, recentProjects, recentPosts] = await Promise.all([
      group(Project, "publication_status"),
      group(Post, "status"),
      Service.countDocuments({ is_active: true }),
      Industry.countDocuments({ is_active: true }),
      FAQ.countDocuments({ is_published: true }),
      Testimonial.countDocuments({ is_published: false }),
      Testimonial.countDocuments({ is_published: true, is_verified: true }),
      PricingPlan.countDocuments({ is_published: true }),
      CredibilityItem.countDocuments({ kind: { $in: [...CLAIM_KINDS] }, is_verified: false }),
      MediaAsset.countDocuments(),
      Project.find().sort({ updated_at: -1 }).limit(4).lean(),
      Post.find().sort({ updated_at: -1 }).limit(4).lean(),
    ]);
    data.content = {
      projects, posts, services_active: servicesActive, industries_active: industriesActive, faqs_published: faqs,
      testimonials_pending: pending, testimonials_published: published, pricing_published: pricing, claims_unverified: claims, media_files: media,
      recently_updated: [
        ...recentProjects.map((p) => ({ type: "project", id: String(p._id), title: p.title, status: p.publication_status, updated_at: p.updated_at })),
        ...recentPosts.map((p) => ({ type: "post", id: String(p._id), title: p.title, status: p.status, updated_at: p.updated_at })),
      ],
    };
  }
  res.json(data);
});

/**
 * Authenticated preview of unpublished content, rendered with the same serializers as the public site.
 * Never cached; the frontend preview route is noindex.
 */
dashboardRouter.get("/preview/:kind/:slug", requireContentEditor, async (req, res) => {
  const slug = String(req.params.slug);
  let data: Record<string, unknown>;
  switch (req.params.kind) {
    case "project": {
      const doc = await Project.findOne({ slug }).populate(projectPopulate).lean();
      if (!doc) throw ApiError.notFound();
      const ctx = await SerializeContext.build([doc.cover_image, doc.thumbnail_image, doc.client_logo], await projectPublicExtras([doc]));
      data = { ...publicProjectDetail(doc, ctx), _status: doc.publication_status };
      break;
    }
    case "post": {
      const doc = await Post.findOne({ slug }).populate([{ path: "author" }, { path: "categories" }, { path: "tags" }]).lean();
      if (!doc) throw ApiError.notFound();
      const ctx = await SerializeContext.build([doc.cover_image, doc.og_image, (doc.author as unknown as Doc | null)?.avatar]);
      data = { ...(await publicPostDetail(doc, ctx)), _status: doc.status };
      break;
    }
    case "service": {
      const doc = await Service.findOne({ slug }).populate("category").lean();
      if (!doc) throw ApiError.notFound();
      const ctx = await SerializeContext.build([doc.cover_image]);
      data = { ...publicServiceDetail(doc, ctx), _status: doc.is_active ? "active" : "inactive" };
      break;
    }
    case "legal": {
      const doc = await LegalPage.findOne({ slug }).lean();
      if (!doc) throw ApiError.notFound();
      data = { ...(await publicLegal(doc)), _status: doc.status };
      break;
    }
    case "page": {
      const doc = await CMSPage.findOne({ slug }).lean();
      if (!doc) throw ApiError.notFound();
      data = { ...(await buildPublicPage(doc)), _status: doc.is_published ? "published" : "draft" };
      break;
    }
    default:
      throw ApiError.notFound("Unknown preview type.");
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.json(data);
});
