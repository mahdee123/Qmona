import { z } from "zod";
import { iconKey, longText, optionalRef, order, requiredText, slug, stringList, text } from "../../lib/validators.js";

export const categorySchema = z.object({
  name: requiredText(100),
  slug: slug(120),
  description: longText(5000).optional(),
  order: order.optional(),
  is_active: z.boolean().optional(),
});

export const serviceSchema = z.object({
  category: optionalRef.optional(),
  title: requiredText(150),
  slug: slug(160),
  tagline: text(255).optional(),
  short_description: requiredText(5000),
  full_content: longText(50_000).optional(),
  icon_key: iconKey.optional(),
  deliverables: stringList("deliverables").optional(),
  cover_image: optionalRef.optional(),
  icon_image: optionalRef.optional(),
  is_featured: z.boolean().optional(),
  meta_title: text(160).optional(),
  meta_description: text(255).optional(),
  order: order.optional(),
  is_active: z.boolean().optional(),
  /** Write-only: replaces the capability list, in order. */
  capability_titles: stringList("capabilities", 40, 150).optional(),
});
