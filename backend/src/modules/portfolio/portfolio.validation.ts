import { z } from "zod";
import {
  decimal, externalUrl, iconKey, longText, objectList, optionalRef, order, refList, requiredText, slug, text,
} from "../../lib/validators.js";
import { CURRENCIES, DELIVERY_STATUSES, GALLERY_KINDS, GALLERY_LAYOUTS, PUBLICATION_STATUSES } from "./portfolio.model.js";

export const productTypeSchema = z.object({
  name: requiredText(100),
  slug: slug(120),
  description: longText(5000).optional(),
  icon_key: iconKey.optional(),
  order: order.optional(),
  is_active: z.boolean().optional(),
});

export const technologySchema = z.object({
  name: requiredText(100),
  slug: slug(120),
  category: text(50).optional(),
  icon: optionalRef.optional(),
  order: order.optional(),
  is_active: z.boolean().optional(),
});

export const projectSchema = z.object({
  title: requiredText(200),
  slug: slug(220),
  tagline: text(255).optional(),
  summary: requiredText(20_000),
  cover_image: optionalRef.optional(),
  thumbnail_image: optionalRef.optional(),
  services: refList.optional(),
  industries: refList.optional(),
  product_types: refList.optional(),
  technologies: refList.optional(),
  client_name: text(150).optional(),
  client_logo: optionalRef.optional(),
  is_client_name_visible: z.boolean().optional(),
  qmona_role: text(255).optional(),
  delivery_status: z.enum(DELIVERY_STATUSES).optional(),
  publication_status: z.enum(PUBLICATION_STATUSES).optional(),
  challenge: longText(20_000).optional(),
  approach: longText(20_000).optional(),
  solution: longText(20_000).optional(),
  key_features: objectList("key features", ["title"], ["description"]).optional(),
  case_study_sections: objectList("case study sections", ["heading", "body"], [], 30, 8000).optional(),
  timeline: text(100).optional(),
  budget_min: decimal.optional(),
  budget_max: decimal.optional(),
  currency: z.enum(CURRENCIES).optional(),
  is_budget_visible: z.boolean().optional(),
  verified_results: objectList("verified outcomes", ["value", "label"], ["source"], 30, 300).optional(),
  live_url: externalUrl().optional(),
  repo_url: externalUrl().optional(),
  is_external_link_visible: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  order: order.optional(),
  meta_title: text(160).optional(),
  meta_description: text(255).optional(),
});

export const gallerySchema = z.object({
  project: z.string().length(24, "Choose a project."),
  media_asset: z.string({ message: "Choose an image." }).length(24, "Choose an image."),
  caption: text(255).optional(),
  alt_text: text(255).optional(),
  kind: z.enum(GALLERY_KINDS).optional(),
  layout: z.enum(GALLERY_LAYOUTS).optional(),
  order: order.optional(),
});
