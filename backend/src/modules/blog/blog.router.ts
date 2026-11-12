import { Router, type Request } from "express";
import type { PipelineStage, QueryFilter } from "mongoose";
import { z } from "zod";
import { ApiError } from "../../errors/api-error.js";
import { resolveBlockMedia, validateBlocks } from "../../lib/blocks.js";
import { manageRouter } from "../../lib/crud.js";
import { pageParams, paginated } from "../../lib/pagination.js";
import { escapeRegex, qs, qsBool } from "../../lib/query.js";
import { assertMediaExist, assertRefsExist } from "../../lib/refs.js";
import { SerializeContext, pick, sid, sids, type Doc } from "../../lib/serialize.js";
import { externalUrl, longText, optionalRef, order, refList, requiredText, slug, text } from "../../lib/validators.js";
import { requireContentEditor } from "../../middleware/auth.js";
import { Author, BlogCategory, POST_STATUSES, Post, Tag, publicPostFilter } from "./blog.model.js";

// ---- validation ----------------------------------------------------------------------------------------
const emptyToNull = (v: unknown) => (v === "" ? null : v);

const authorSchema = z.object({
  name: requiredText(120),
  slug: slug(140),
  role_title: text(120).optional(),
  bio: longText(5000).optional(),
  avatar: optionalRef.optional(),
  linkedin_url: externalUrl().optional(),
});
const categorySchema = z.object({ name: requiredText(80), slug: slug(100), description: longText(2000).optional(), order: order.optional() });
const tagSchema = z.object({ name: requiredText(60), slug: slug(80) });
const postSchema = z.object({
  title: requiredText(200),
  slug: slug(220),
  excerpt: requiredText(500),
  cover_image: optionalRef.optional(),
  author: optionalRef.optional(),
  categories: refList.optional(),
  tags: refList.optional(),
  body: z.array(z.unknown()).nullable().optional(),
  status: z.enum(POST_STATUSES).optional(),
  published_at: z.preprocess(emptyToNull, z.coerce.date().nullable()).optional(),
  is_featured: z.boolean().optional(),
  meta_title: text(160).optional(),
  meta_description: text(255).optional(),
  og_image: optionalRef.optional(),
});

// ---- serializers ---------------------------------------------------------------------------------------
const publicAuthor = (a: Doc, ctx: SerializeContext) => ({
  ...pick(a, ["name", "slug", "role_title", "bio"]),
  avatar: ctx.media(a.avatar),
  linkedin_url: a.linkedin_url,
});

function publicPostList(p: Doc, ctx: SerializeContext) {
  const author = p.author && typeof p.author === "object" && "name" in p.author ? p.author : null;
  return {
    id: sid(p._id),
    ...pick(p, ["title", "slug", "excerpt"]),
    cover_image: ctx.media(p.cover_image),
    author: author ? publicAuthor(author, ctx) : null,
    categories: ((p.categories as Doc[]) ?? []).filter((c) => c && "name" in c).map((c) => pick(c, ["name", "slug", "description"])),
    tags: ((p.tags as Doc[]) ?? []).filter((t) => t && "name" in t).map((t) => pick(t, ["name", "slug"])),
    ...pick(p, ["published_at", "reading_minutes", "is_featured"]),
  };
}

export async function publicPostDetail(p: Doc, ctx: SerializeContext) {
  return {
    ...publicPostList(p, ctx),
    body: await resolveBlockMedia(p.body),
    ...pick(p, ["meta_title", "meta_description"]),
    og_image: ctx.media(p.og_image),
    updated_at: p.updated_at,
  };
}

const postPopulate = [{ path: "author" }, { path: "categories" }, { path: "tags" }];

/** Post detail needs its body resolved, which is async, so the public detail route is written out here. */
async function postContext(docs: Doc[]) {
  return SerializeContext.build(docs.flatMap((d) => [d.cover_image, d.og_image, d.author?.avatar]));
}

// ---- routes --------------------------------------------------------------------------------------------
export function blogPublicRoutes(api: Router) {
  const posts = Router();

  async function listFilter(req: Request): Promise<QueryFilter<Doc>> {
    const clauses: QueryFilter<Doc>[] = [];
    const category = qs(req, "category");
    if (category) clauses.push({ categories: { $in: (await BlogCategory.find({ slug: category }, "_id").lean()).map((c) => c._id) } });
    const tag = qs(req, "tag");
    if (tag) clauses.push({ tags: { $in: (await Tag.find({ slug: tag }, "_id").lean()).map((t) => t._id) } });
    if (qsBool(req, "featured") === true) clauses.push({ is_featured: true });
    const term = qs(req, "search").slice(0, 100);
    if (term) {
      const re = new RegExp(escapeRegex(term), "i");
      clauses.push({ $or: [{ title: re }, { excerpt: re }] });
    }
    return clauses.length ? { $and: clauses } : {};
  }

  // The author's avatar is nested, so list responses need their media loaded from the populated authors.
  posts.get("/", async (req, res, next) => {
    try {
      const filter = { $and: [publicPostFilter(), await listFilter(req)] };
      const { page, pageSize, skip } = pageParams(req);
      const [docs, count] = await Promise.all([
        Post.find(filter).sort({ published_at: -1, _id: 1 }).skip(skip).limit(pageSize).populate(postPopulate).lean(),
        Post.countDocuments(filter),
      ]);
      const ctx = await postContext(docs);
      res.json(paginated(req, docs.map((d) => publicPostList(d, ctx)), count, page, pageSize));
    } catch (err) {
      next(err);
    }
  });

  posts.get("/:slug/related", async (req, res) => {
    const post = await Post.findOne({ $and: [publicPostFilter(), { slug: String(req.params.slug) }] }).lean();
    if (!post) throw ApiError.notFound();
    const others = await Post.find({ $and: [publicPostFilter(), { _id: { $ne: post._id } }] })
      .sort({ published_at: -1 })
      .populate(postPopulate)
      .lean();
    const shared = (o: Doc) =>
      sids(o.categories).filter((x) => sids(post.categories).includes(x)).length + sids(o.tags).filter((x) => sids(post.tags).includes(x)).length;
    const items = others
      .map((o, i) => ({ o, score: shared(o), i }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, 4)
      .map((r) => r.o);
    const ctx = await postContext(items);
    res.json(items.map((p) => publicPostList(p, ctx)));
  });

  posts.get("/:slug", async (req, res) => {
    const post = await Post.findOne({ $and: [publicPostFilter(), { slug: String(req.params.slug) }] }).populate(postPopulate).lean();
    if (!post) throw ApiError.notFound();
    res.json(await publicPostDetail(post, await postContext([post])));
  });
  api.use("/blog/posts", posts);

  // Only categories that actually have a published post are offered to visitors.
  api.get("/blog/categories", async (_req, res) => {
    const used = await Post.distinct("categories", publicPostFilter());
    const cats = await BlogCategory.find({ _id: { $in: used } }).sort({ order: 1, name: 1 }).lean();
    res.json(cats.map((c) => pick(c, ["name", "slug", "description"])));
  });
  api.get("/blog/categories/:slug", async (req, res) => {
    const cat = await BlogCategory.findOne({ slug: String(req.params.slug) }).lean();
    if (!cat || !(await Post.exists({ $and: [publicPostFilter(), { categories: cat._id }] }))) throw ApiError.notFound();
    res.json(pick(cat, ["name", "slug", "description"]));
  });
}

async function postCounts(field: "author" | "categories" | "tags", docs: Doc[]) {
  const ids = docs.map((d) => d._id);
  const pipeline: PipelineStage[] = [{ $match: { [field]: { $in: ids } } }];
  if (field !== "author") pipeline.push({ $unwind: `$${field}` }, { $match: { [field]: { $in: ids } } });
  pipeline.push({ $group: { _id: `$${field}`, n: { $sum: 1 } } });
  const rows = await Post.aggregate(pipeline);
  return Object.fromEntries(docs.map((d) => [String(d._id), { posts_count: rows.find((r) => String(r._id) === String(d._id))?.n ?? 0 }]));
}

export function blogManageRoutes(manage: Router) {
  manage.use(
    "/blog/authors",
    manageRouter({
      path: "blog/authors",
      model: Author,
      auditName: "Author",
      guard: requireContentEditor,
      schema: authorSchema,
      mediaFields: ["avatar"],
      sort: { name: 1 },
      paginate: false,
      tags: ["blog"],
      extras: (docs) => postCounts("author", docs),
      serialize: (a, ctx) => ({
        id: sid(a._id),
        ...pick(a, ["name", "slug", "role_title", "bio"]),
        avatar: sid(a.avatar),
        avatar_detail: ctx.media(a.avatar),
        linkedin_url: a.linkedin_url,
        posts_count: ctx.extra(a._id).posts_count ?? 0,
        updated_at: a.updated_at,
      }),
      prepare: async (data) => void (await assertMediaExist(data, ["avatar"])),
      afterDelete: async (a) => void (await Post.updateMany({ author: a._id }, { $set: { author: null } })),
    }),
  );

  manage.use(
    "/blog/categories",
    manageRouter({
      path: "blog/categories",
      model: BlogCategory,
      auditName: "BlogCategory",
      guard: requireContentEditor,
      schema: categorySchema,
      sort: { order: 1, name: 1 },
      paginate: false,
      orderable: true,
      tags: ["blog"],
      extras: (docs) => postCounts("categories", docs),
      serialize: (c, ctx) => ({ id: sid(c._id), ...pick(c, ["name", "slug", "description", "order"]), posts_count: ctx.extra(c._id).posts_count ?? 0, updated_at: c.updated_at }),
      afterDelete: async (c) => void (await Post.updateMany({ categories: c._id }, { $pull: { categories: c._id } })),
    }),
  );

  manage.use(
    "/blog/tags",
    manageRouter({
      path: "blog/tags",
      model: Tag,
      auditName: "Tag",
      guard: requireContentEditor,
      schema: tagSchema,
      sort: { name: 1 },
      paginate: false,
      tags: ["blog"],
      extras: (docs) => postCounts("tags", docs),
      serialize: (t, ctx) => ({ id: sid(t._id), ...pick(t, ["name", "slug"]), posts_count: ctx.extra(t._id).posts_count ?? 0, updated_at: t.updated_at }),
      afterDelete: async (t) => void (await Post.updateMany({ tags: t._id }, { $pull: { tags: t._id } })),
    }),
  );

  manage.use(
    "/blog/posts",
    manageRouter({
      path: "blog/posts",
      model: Post,
      auditName: "Post",
      guard: requireContentEditor,
      schema: postSchema,
      populate: [{ path: "author", select: "name" }],
      mediaFields: ["cover_image"],
      search: ["title", "excerpt"],
      filters: { eq: ["status"], ref: ["author"], bool: ["is_featured"] },
      sort: { updated_at: -1 },
      sortable: ["published_at", "updated_at", "title"],
      tags: ["blog", "site"],
      serialize: (p, ctx) => ({
        id: sid(p._id),
        ...pick(p, ["title", "slug", "excerpt"]),
        cover_image: sid(p.cover_image),
        cover_image_detail: ctx.media(p.cover_image),
        author: sid(p.author),
        author_name: p.author?.name ?? null,
        categories: sids(p.categories),
        tags: sids(p.tags),
        body: p.body ?? [],
        ...pick(p, ["status", "published_at", "is_featured", "reading_minutes", "meta_title", "meta_description"]),
        og_image: sid(p.og_image),
        ...pick(p, ["created_at", "updated_at"]),
      }),
      prepare: async (data) => {
        if (data.body !== undefined) data.body = await validateBlocks(data.body, "body");
        await assertMediaExist(data, ["cover_image", "og_image"]);
        await Promise.all([
          assertRefsExist(Author, data, "author", "author"),
          assertRefsExist(BlogCategory, data, "categories", "category"),
          assertRefsExist(Tag, data, "tags", "tag"),
        ]);
      },
    }),
  );
}
