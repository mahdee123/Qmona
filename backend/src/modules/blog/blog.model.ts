import { Schema, model, type QueryFilter, type Types } from "mongoose";
import { blocksPlainText, type Block } from "../../lib/blocks.js";
import { registerMediaRefs } from "../../lib/media-refs.js";
import { mediaRef, mixedList, orderField, ref, refs, timestamps } from "../../lib/schema.js";

export interface AuthorAttrs {
  name: string;
  slug: string;
  role_title: string;
  bio: string;
  avatar: Types.ObjectId | null;
  linkedin_url: string;
  created_at: Date;
  updated_at: Date;
}
const authorSchema = new Schema<AuthorAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, maxlength: 140, unique: true },
    role_title: { type: String, default: "", maxlength: 120 },
    bio: { type: String, default: "" },
    avatar: mediaRef,
    linkedin_url: { type: String, default: "" },
  },
  timestamps,
);
export const Author = model<AuthorAttrs>("Author", authorSchema);

export interface BlogCategoryAttrs {
  name: string;
  slug: string;
  description: string;
  order: number;
  created_at: Date;
  updated_at: Date;
}
const categorySchema = new Schema<BlogCategoryAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    slug: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    description: { type: String, default: "" },
    order: orderField,
  },
  timestamps,
);
export const BlogCategory = model<BlogCategoryAttrs>("BlogCategory", categorySchema);

export interface TagAttrs {
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}
const tagSchema = new Schema<TagAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    slug: { type: String, required: true, trim: true, maxlength: 80, unique: true },
  },
  timestamps,
);
export const Tag = model<TagAttrs>("Tag", tagSchema);

export const POST_STATUSES = ["draft", "published", "archived"] as const;

export interface PostAttrs {
  title: string;
  slug: string;
  excerpt: string;
  cover_image: Types.ObjectId | null;
  author: Types.ObjectId | null;
  categories: Types.ObjectId[];
  tags: Types.ObjectId[];
  body: Block[];
  status: (typeof POST_STATUSES)[number];
  published_at: Date | null;
  is_featured: boolean;
  reading_minutes: number;
  meta_title: string;
  meta_description: string;
  og_image: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}
const postSchema = new Schema<PostAttrs>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, maxlength: 220, unique: true },
    excerpt: { type: String, required: true, maxlength: 500 },
    cover_image: mediaRef,
    author: ref("Author"),
    categories: refs("BlogCategory"),
    tags: refs("Tag"),
    body: mixedList,
    status: { type: String, enum: POST_STATUSES, default: "draft", index: true },
    published_at: { type: Date, default: null, index: true },
    is_featured: { type: Boolean, default: false, index: true },
    reading_minutes: { type: Number, default: 1 },
    meta_title: { type: String, default: "", maxlength: 160 },
    meta_description: { type: String, default: "", maxlength: 255 },
    og_image: mediaRef,
  },
  timestamps,
);
postSchema.index({ status: 1, published_at: 1 });

postSchema.pre("save", function () {
  const words = blocksPlainText(this.body).split(/\s+/).filter(Boolean).length;
  this.reading_minutes = Math.max(1, Math.ceil(words / 220));
  if (this.status === "published" && !this.published_at) this.published_at = new Date();
});

export const Post = model<PostAttrs>("Post", postSchema);

/** Posts visible on the public site: published, and not scheduled for the future. */
export const publicPostFilter = (): QueryFilter<any> => ({ status: "published", published_at: { $lte: new Date() } });

registerMediaRefs({
  type: "blog.author",
  label: "Author",
  model: Author,
  idFields: ["avatar"],
  titleOf: (d) => String(d.name),
});
registerMediaRefs({
  type: "blog.post",
  label: "Blog post",
  model: Post,
  idFields: ["cover_image", "og_image"],
  blockPaths: ["body.media_id"],
  titleOf: (d) => String(d.title),
});
