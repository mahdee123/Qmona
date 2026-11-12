import { Schema, model, type Types } from "mongoose";
import { ICON_KEYS } from "../../lib/icons.js";
import { registerMediaRefs } from "../../lib/media-refs.js";
import { mediaRef, orderField, ref, timestamps } from "../../lib/schema.js";

export interface ServiceCategoryAttrs {
  name: string;
  slug: string;
  description: string;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const categorySchema = new Schema<ServiceCategoryAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    slug: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    description: { type: String, default: "" },
    order: orderField,
    is_active: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const ServiceCategory = model<ServiceCategoryAttrs>("ServiceCategory", categorySchema);

export interface CapabilityAttrs {
  _id: Types.ObjectId;
  title: string;
  description: string;
  order: number;
}

export interface ServiceAttrs {
  category: Types.ObjectId | null;
  title: string;
  slug: string;
  tagline: string;
  short_description: string;
  full_content: string;
  icon_key: string;
  deliverables: string[];
  cover_image: Types.ObjectId | null;
  icon_image: Types.ObjectId | null;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  order: number;
  is_active: boolean;
  /** Embedded: capabilities only ever belong to one service, so they live inside it. */
  capabilities: CapabilityAttrs[];
  created_at: Date;
  updated_at: Date;
}

const serviceSchema = new Schema<ServiceAttrs>(
  {
    category: ref("ServiceCategory"),
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, trim: true, maxlength: 160, unique: true },
    tagline: { type: String, default: "", maxlength: 255 },
    short_description: { type: String, required: true },
    full_content: { type: String, default: "" },
    icon_key: { type: String, enum: ICON_KEYS, default: "layers" },
    deliverables: { type: [String], default: [] },
    cover_image: mediaRef,
    icon_image: mediaRef,
    is_featured: { type: Boolean, default: true, index: true },
    meta_title: { type: String, default: "", maxlength: 160 },
    meta_description: { type: String, default: "", maxlength: 255 },
    order: orderField,
    is_active: { type: Boolean, default: true, index: true },
    capabilities: {
      type: [
        new Schema(
          {
            title: { type: String, required: true, maxlength: 150 },
            description: { type: String, default: "" },
            order: { type: Number, default: 0 },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
  },
  timestamps,
);
export const Service = model<ServiceAttrs>("Service", serviceSchema);

registerMediaRefs({
  type: "services.service",
  label: "Service",
  model: Service,
  idFields: ["cover_image", "icon_image"],
  titleOf: (d) => String(d.title),
});
