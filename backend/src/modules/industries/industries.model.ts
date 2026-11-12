import { Schema, model, type Types } from "mongoose";
import { ICON_KEYS } from "../../lib/icons.js";
import { registerMediaRefs } from "../../lib/media-refs.js";
import { mediaRef, orderField, timestamps } from "../../lib/schema.js";

export interface IndustryAttrs {
  name: string;
  slug: string;
  description: string;
  overview: string;
  focus_areas: string[];
  icon_key: string;
  icon: Types.ObjectId | null;
  cover_image: Types.ObjectId | null;
  meta_title: string;
  meta_description: string;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const industrySchema = new Schema<IndustryAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    slug: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    description: { type: String, default: "" },
    overview: { type: String, default: "" },
    focus_areas: { type: [String], default: [] },
    icon_key: { type: String, enum: ICON_KEYS, default: "briefcase" },
    icon: mediaRef,
    cover_image: mediaRef,
    meta_title: { type: String, default: "", maxlength: 160 },
    meta_description: { type: String, default: "", maxlength: 255 },
    order: orderField,
    is_active: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const Industry = model<IndustryAttrs>("Industry", industrySchema);

registerMediaRefs({
  type: "industries.industry",
  label: "Industry",
  model: Industry,
  idFields: ["icon", "cover_image"],
  titleOf: (d) => String(d.name),
});
