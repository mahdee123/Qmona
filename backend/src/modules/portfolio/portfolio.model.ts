import { Schema, model, type Types } from "mongoose";
import { ICON_KEYS } from "../../lib/icons.js";
import { registerMediaRefs } from "../../lib/media-refs.js";
import { mediaRef, orderField, refs, timestamps } from "../../lib/schema.js";

export const CURRENCIES = ["USD", "EUR", "GBP", "BDT", "AUD", "CAD", "SGD", "AED", "INR", "JPY"] as const;
export const PUBLICATION_STATUSES = ["Draft", "Published", "Archived"] as const;
export const DELIVERY_STATUSES = ["Concept", "Design", "In Development", "Delivered", "Live"] as const;

// ---- taxonomies ----------------------------------------------------------------------------------
export interface ProductTypeAttrs {
  name: string;
  slug: string;
  description: string;
  icon_key: string;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
const productTypeSchema = new Schema<ProductTypeAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    slug: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    description: { type: String, default: "" },
    icon_key: { type: String, enum: ICON_KEYS, default: "layers" },
    order: orderField,
    is_active: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const ProductType = model<ProductTypeAttrs>("ProductType", productTypeSchema);

export interface TechnologyAttrs {
  name: string;
  slug: string;
  category: string;
  icon: Types.ObjectId | null;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
const technologySchema = new Schema<TechnologyAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    slug: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    category: { type: String, default: "", maxlength: 50 },
    icon: mediaRef,
    order: orderField,
    is_active: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const Technology = model<TechnologyAttrs>("Technology", technologySchema);

// ---- projects ------------------------------------------------------------------------------------
export interface ProjectAttrs {
  title: string;
  slug: string;
  tagline: string;
  summary: string;
  cover_image: Types.ObjectId | null;
  thumbnail_image: Types.ObjectId | null;
  services: Types.ObjectId[];
  industries: Types.ObjectId[];
  product_types: Types.ObjectId[];
  technologies: Types.ObjectId[];
  client_name: string;
  client_logo: Types.ObjectId | null;
  is_client_name_visible: boolean;
  qmona_role: string;
  delivery_status: (typeof DELIVERY_STATUSES)[number];
  publication_status: (typeof PUBLICATION_STATUSES)[number];
  challenge: string;
  approach: string;
  solution: string;
  key_features: { title: string; description: string }[];
  case_study_sections: { heading: string; body: string }[];
  timeline: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: (typeof CURRENCIES)[number];
  is_budget_visible: boolean;
  verified_results: { value: string; label: string; source: string }[];
  live_url: string;
  repo_url: string;
  is_external_link_visible: boolean;
  published_at: Date | null;
  is_featured: boolean;
  order: number;
  meta_title: string;
  meta_description: string;
  created_at: Date;
  updated_at: Date;
}

const projectSchema = new Schema<ProjectAttrs>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, maxlength: 220, unique: true },
    tagline: { type: String, default: "", maxlength: 255 },
    summary: { type: String, required: true },
    cover_image: mediaRef,
    thumbnail_image: mediaRef,
    services: refs("Service"),
    industries: refs("Industry"),
    product_types: refs("ProductType"),
    technologies: refs("Technology"),
    client_name: { type: String, default: "", maxlength: 150 },
    client_logo: mediaRef,
    // Confidential by default: the client is only named publicly when an editor opts in.
    is_client_name_visible: { type: Boolean, default: true },
    qmona_role: { type: String, default: "", maxlength: 255 },
    delivery_status: { type: String, enum: DELIVERY_STATUSES, default: "Delivered", index: true },
    publication_status: { type: String, enum: PUBLICATION_STATUSES, default: "Draft", index: true },
    challenge: { type: String, default: "" },
    approach: { type: String, default: "" },
    solution: { type: String, default: "" },
    key_features: { type: [{ _id: false, title: String, description: { type: String, default: "" } }], default: [] },
    case_study_sections: { type: [{ _id: false, heading: String, body: String }], default: [] },
    timeline: { type: String, default: "", maxlength: 100 },
    budget_min: { type: Number, default: null },
    budget_max: { type: Number, default: null },
    currency: { type: String, enum: CURRENCIES, default: "USD" },
    is_budget_visible: { type: Boolean, default: false },
    verified_results: {
      type: [{ _id: false, value: String, label: String, source: { type: String, default: "" } }],
      default: [],
    },
    live_url: { type: String, default: "" },
    repo_url: { type: String, default: "" },
    is_external_link_visible: { type: Boolean, default: true },
    published_at: { type: Date, default: null, index: true },
    is_featured: { type: Boolean, default: false, index: true },
    order: orderField,
    meta_title: { type: String, default: "", maxlength: 160 },
    meta_description: { type: String, default: "", maxlength: 255 },
  },
  timestamps,
);
projectSchema.index({ publication_status: 1, is_featured: 1, order: 1 });

// Publishing stamps the first publication date.
projectSchema.pre("save", function () {
  if (this.publication_status === "Published" && !this.published_at) this.published_at = new Date();
});

export const Project = model<ProjectAttrs>("Project", projectSchema);

// ---- project gallery -----------------------------------------------------------------------------
export const GALLERY_KINDS = ["mockup", "screenshot", "photo"] as const;
export const GALLERY_LAYOUTS = ["full", "half"] as const;

export interface GalleryItemAttrs {
  project: Types.ObjectId;
  media_asset: Types.ObjectId;
  caption: string;
  alt_text: string;
  kind: (typeof GALLERY_KINDS)[number];
  layout: (typeof GALLERY_LAYOUTS)[number];
  order: number;
  created_at: Date;
  updated_at: Date;
}
const gallerySchema = new Schema<GalleryItemAttrs>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    media_asset: { type: Schema.Types.ObjectId, ref: "MediaAsset", required: true },
    caption: { type: String, default: "", maxlength: 255 },
    alt_text: { type: String, default: "", maxlength: 255 },
    kind: { type: String, enum: GALLERY_KINDS, default: "mockup" },
    layout: { type: String, enum: GALLERY_LAYOUTS, default: "full" },
    order: orderField,
  },
  timestamps,
);
export const ProjectGalleryItem = model<GalleryItemAttrs>("ProjectGalleryItem", gallerySchema);

registerMediaRefs({ type: "portfolio.technology", label: "Technology", model: Technology, idFields: ["icon"], titleOf: (d) => String(d.name) });
registerMediaRefs({
  type: "portfolio.project",
  label: "Project",
  model: Project,
  idFields: ["cover_image", "thumbnail_image", "client_logo"],
  titleOf: (d) => String(d.title),
});
registerMediaRefs({
  type: "portfolio.projectgalleryitem",
  label: "Project gallery",
  model: ProjectGalleryItem,
  idFields: ["media_asset"],
  titleOf: (d) => `image #${String(d.order)}`,
});
