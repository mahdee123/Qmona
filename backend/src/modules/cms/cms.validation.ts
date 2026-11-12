import { z } from "zod";
import {
  decimal, email, externalUrl, iconKey, linkUrl, longText, objectId, optionalRef, order, requiredText, slug, stringList, text,
} from "../../lib/validators.js";
import { CURRENCIES } from "../portfolio/portfolio.model.js";
import {
  ACCENTS, ANIMATION_PRESETS, BILLING, CREDIBILITY_KINDS, FORM_KINDS, LEGAL_STATUSES, NAV_LOCATIONS, PLATFORMS, PRICING_VARIANTS,
  SECTION_TYPES, VARIANTS,
} from "./cms.model.js";

const emptyToNull = (v: unknown) => (v === "" ? null : v);
const optionalEmail = z.union([z.literal(""), email]);
const decimalInRange = (min: number, max: number) =>
  z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number({ message: "Enter a number." }).min(min, `Min ${min}.`).max(max, `Max ${max}.`));

export const profileSchema = z.object({
  agency_name: requiredText(100),
  short_name: requiredText(40),
  tagline: text(200),
  description: longText(5000),
  email: optionalEmail,
  support_email: optionalEmail,
  phone: text(40),
  whatsapp: text(40),
  address: longText(1000),
  city: text(80),
  country: text(80),
  office_hours: text(150),
  timezone_label: text(60),
  availability_label: text(60),
  logo: optionalRef,
  logo_on_dark: optionalRef,
  favicon: optionalRef,
  accent: z.enum(ACCENTS),
  animations_enabled: z.boolean(),
  default_meta_title: text(160),
  default_meta_description: text(255),
  og_image: optionalRef,
  footer_note: text(255),
  privacy_notice: longText(5000),
});

export const settingSchema = z.object({
  key: z.string().trim().min(1, "This field is required.").max(100),
  value: z.unknown(),
  group: text(50).optional(),
  description: text(255).optional(),
  is_public: z.boolean().optional(),
});

export const pageSchema = z.object({
  slug: slug(100),
  title: requiredText(200),
  meta_title: text(160).optional(),
  meta_description: text(255).optional(),
  og_image: optionalRef.optional(),
  is_published: z.boolean().optional(),
});

export const sectionSchema = z.object({
  page: objectId,
  section_type: z.enum(SECTION_TYPES),
  variant: z.enum(VARIANTS).optional(),
  label: text(60).optional(),
  headline: text(255).optional(),
  subheadline: longText(5000).optional(),
  content_data: z.unknown().optional(),
  style: z.unknown().optional(),
  order: order.optional(),
  is_active: z.boolean().optional(),
  animation_enabled: z.boolean().optional(),
  animation_preset: z.enum(ANIMATION_PRESETS).optional(),
  animation_duration: decimalInRange(0.2, 1.2).optional(),
  animation_delay: decimalInRange(0, 1.5).optional(),
});

export const faqSchema = z.object({
  question: requiredText(300),
  answer: requiredText(10_000),
  category: text(100).optional(),
  service: optionalRef.optional(),
  show_on_home: z.boolean().optional(),
  order: order.optional(),
  is_published: z.boolean().optional(),
});

export const testimonialSchema = z.object({
  client_name: requiredText(150),
  client_role: text(150).optional(),
  company_name: text(150).optional(),
  content: requiredText(5000),
  metric_value: text(30).optional(),
  metric_label: text(120).optional(),
  project: optionalRef.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  avatar: optionalRef.optional(),
  evidence_note: longText(2000).optional(),
  is_featured: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  is_published: z.boolean().optional(),
  order: order.optional(),
});

export const teamSchema = z.object({
  full_name: requiredText(150),
  role_title: requiredText(150),
  bio: longText(5000).optional(),
  avatar: optionalRef.optional(),
  linkedin_url: externalUrl().optional(),
  order: order.optional(),
  is_published: z.boolean().optional(),
});

export const pricingSchema = z.object({
  name: requiredText(100),
  slug: slug(120),
  description: longText(2000).optional(),
  price_amount: decimal.optional(),
  currency: z.enum(CURRENCIES).optional(),
  price_prefix: text(40).optional(),
  billing: z.enum(BILLING).optional(),
  badge: text(40).optional(),
  features: stringList("features", 20).optional(),
  icon_key: iconKey.optional(),
  cta_label: requiredText(60).optional(),
  cta_url: linkUrl.optional(),
  variant: z.enum(PRICING_VARIANTS).optional(),
  order: order.optional(),
  is_published: z.boolean().optional(),
});

export const processSchema = z.object({
  title: requiredText(120),
  description: requiredText(5000),
  icon_key: iconKey.optional(),
  image: optionalRef.optional(),
  deliverables: stringList("deliverables").optional(),
  order: order.optional(),
  is_published: z.boolean().optional(),
});

export const credibilitySchema = z.object({
  kind: z.enum(CREDIBILITY_KINDS).optional(),
  value: text(40).optional(),
  title: requiredText(150),
  description: longText(2000).optional(),
  icon_key: iconKey.optional(),
  logo: optionalRef.optional(),
  link_url: linkUrl.optional(),
  evidence_note: longText(2000).optional(),
  is_verified: z.boolean().optional(),
  is_published: z.boolean().optional(),
  order: order.optional(),
});

export const navigationSchema = z.object({
  location: z.enum(NAV_LOCATIONS),
  parent: optionalRef.optional(),
  label: requiredText(60),
  url: z.string().trim().min(1, "This field is required.").pipe(linkUrl),
  description: text(140).optional(),
  icon_key: z.preprocess((v) => (v === null ? "" : v), z.union([z.literal(""), iconKey])).optional(),
  badge: text(20).optional(),
  open_in_new_tab: z.boolean().optional(),
  is_cta: z.boolean().optional(),
  order: order.optional(),
  is_visible: z.boolean().optional(),
});

export const socialSchema = z.object({
  platform: z.enum(PLATFORMS),
  label: text(60).optional(),
  url: z.string().trim().min(1, "This field is required.").pipe(externalUrl()),
  order: order.optional(),
  is_visible: z.boolean().optional(),
});

export const legalSchema = z.object({
  slug: slug(80),
  title: requiredText(150),
  summary: longText(5000).optional(),
  body: z.array(z.unknown()).nullable().optional(),
  status: z.enum(LEGAL_STATUSES).optional(),
  last_reviewed: z.preprocess(emptyToNull, z.coerce.date().nullable()).optional(),
  meta_title: text(160).optional(),
  meta_description: text(255).optional(),
});

export const formOptionSchema = z.object({
  kind: z.enum(FORM_KINDS),
  value: slug(60),
  label: requiredText(120),
  order: order.optional(),
  is_active: z.boolean().optional(),
});
