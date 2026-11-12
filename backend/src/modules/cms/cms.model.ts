import { Schema, model, type Types } from "mongoose";
import type { Block } from "../../lib/blocks.js";
import { ICON_KEYS } from "../../lib/icons.js";
import { registerMediaRefs } from "../../lib/media-refs.js";
import { mediaRef, mixedList, orderField, ref, timestamps } from "../../lib/schema.js";
import { CURRENCIES } from "../portfolio/portfolio.model.js";

const iconOrEmpty = { type: String, enum: [...ICON_KEYS, ""], default: "" } as const;

// ---- site-wide settings ----------------------------------------------------------------------------
export interface SiteSettingAttrs {
  key: string;
  value: unknown;
  group: string;
  description: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}
const settingSchema = new Schema<SiteSettingAttrs>(
  {
    key: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    value: { type: Schema.Types.Mixed, default: {} },
    group: { type: String, default: "general", maxlength: 50, index: true },
    description: { type: String, default: "", maxlength: 255 },
    is_public: { type: Boolean, default: true },
  },
  { ...timestamps, minimize: false },
);
export const SiteSetting = model<SiteSettingAttrs>("SiteSetting", settingSchema);

export const ACCENTS = ["red", "orange", "blue", "violet", "green"] as const;

export interface SiteProfileAttrs {
  singleton: number;
  agency_name: string;
  short_name: string;
  tagline: string;
  description: string;
  email: string;
  support_email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  office_hours: string;
  timezone_label: string;
  availability_label: string;
  logo: Types.ObjectId | null;
  logo_on_dark: Types.ObjectId | null;
  favicon: Types.ObjectId | null;
  accent: (typeof ACCENTS)[number];
  animations_enabled: boolean;
  default_meta_title: string;
  default_meta_description: string;
  og_image: Types.ObjectId | null;
  footer_note: string;
  privacy_notice: string;
  created_at: Date;
  updated_at: Date;
}
const profileSchema = new Schema<SiteProfileAttrs>(
  {
    // Always 1: there is exactly one profile document.
    singleton: { type: Number, default: 1, unique: true },
    agency_name: { type: String, default: "Qmona Agency", maxlength: 100 },
    short_name: { type: String, default: "Qmona", maxlength: 40 },
    tagline: { type: String, default: "", maxlength: 200 },
    description: { type: String, default: "" },
    email: { type: String, default: "" },
    support_email: { type: String, default: "" },
    phone: { type: String, default: "", maxlength: 40 },
    whatsapp: { type: String, default: "", maxlength: 40 },
    address: { type: String, default: "" },
    city: { type: String, default: "", maxlength: 80 },
    country: { type: String, default: "Bangladesh", maxlength: 80 },
    office_hours: { type: String, default: "", maxlength: 150 },
    timezone_label: { type: String, default: "Asia/Dhaka (GMT+6)", maxlength: 60 },
    availability_label: { type: String, default: "Open for new projects", maxlength: 60 },
    logo: mediaRef,
    logo_on_dark: mediaRef,
    favicon: mediaRef,
    accent: { type: String, enum: ACCENTS, default: "red" },
    animations_enabled: { type: Boolean, default: true },
    default_meta_title: { type: String, default: "", maxlength: 160 },
    default_meta_description: { type: String, default: "", maxlength: 255 },
    og_image: mediaRef,
    footer_note: { type: String, default: "", maxlength: 255 },
    privacy_notice: { type: String, default: "" },
  },
  timestamps,
);
export const SiteProfile = model<SiteProfileAttrs>("SiteProfile", profileSchema);

/** The single profile document, created with defaults on first use. */
export async function loadProfile() {
  return (await SiteProfile.findOne({ singleton: 1 })) ?? (await SiteProfile.create({ singleton: 1 }));
}

// ---- pages & sections ------------------------------------------------------------------------------
export interface CMSPageAttrs {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  og_image: Types.ObjectId | null;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}
const pageSchema = new Schema<CMSPageAttrs>(
  {
    slug: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    meta_title: { type: String, default: "", maxlength: 160 },
    meta_description: { type: String, default: "", maxlength: 255 },
    og_image: mediaRef,
    is_published: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const CMSPage = model<CMSPageAttrs>("CMSPage", pageSchema);

export const SECTION_TYPES = [
  "hero", "featured_project", "capability_ticker", "impact", "services", "projects", "process", "pricing",
  "testimonials", "faq", "contact", "blog", "cta_banner", "page_hero", "story", "values", "team", "industries", "rich_text",
] as const;
export const VARIANTS = ["default", "centered", "split", "dark", "light"] as const;
export const ANIMATION_PRESETS = ["fade_up", "fade", "scale", "none"] as const;

export interface CMSSectionAttrs {
  page: Types.ObjectId;
  section_type: (typeof SECTION_TYPES)[number];
  variant: (typeof VARIANTS)[number];
  label: string;
  headline: string;
  subheadline: string;
  content_data: Record<string, unknown>;
  style: Record<string, unknown>;
  /** Media ids referenced by content_data, kept in sync on save so usage can be looked up with an index. */
  media_ids: string[];
  order: number;
  is_active: boolean;
  animation_enabled: boolean;
  animation_preset: (typeof ANIMATION_PRESETS)[number];
  animation_duration: number;
  animation_delay: number;
  created_at: Date;
  updated_at: Date;
}
const sectionSchema = new Schema<CMSSectionAttrs>(
  {
    page: { type: Schema.Types.ObjectId, ref: "CMSPage", required: true, index: true },
    section_type: { type: String, enum: SECTION_TYPES, required: true, index: true },
    variant: { type: String, enum: VARIANTS, default: "default" },
    label: { type: String, default: "", maxlength: 60 },
    headline: { type: String, default: "", maxlength: 255 },
    subheadline: { type: String, default: "" },
    content_data: { type: Schema.Types.Mixed, default: {} },
    style: { type: Schema.Types.Mixed, default: {} },
    media_ids: { type: [String], default: [], index: true },
    order: orderField,
    is_active: { type: Boolean, default: true, index: true },
    animation_enabled: { type: Boolean, default: true },
    animation_preset: { type: String, enum: ANIMATION_PRESETS, default: "fade_up" },
    animation_duration: { type: Number, default: 0.6, min: 0.2, max: 1.2 },
    animation_delay: { type: Number, default: 0, min: 0, max: 1.5 },
  },
  { ...timestamps, minimize: false },
);
export const CMSSection = model<CMSSectionAttrs>("CMSSection", sectionSchema);

// ---- FAQ, testimonials, team, pricing, process, credibility -----------------------------------------
export interface FAQAttrs {
  question: string;
  answer: string;
  category: string;
  service: Types.ObjectId | null;
  show_on_home: boolean;
  order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}
const faqSchema = new Schema<FAQAttrs>(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true },
    category: { type: String, default: "", maxlength: 100, index: true },
    service: ref("Service"),
    show_on_home: { type: Boolean, default: true, index: true },
    order: orderField,
    is_published: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const FAQ = model<FAQAttrs>("FAQ", faqSchema);

export interface TestimonialAttrs {
  client_name: string;
  client_role: string;
  company_name: string;
  content: string;
  metric_value: string;
  metric_label: string;
  project: Types.ObjectId | null;
  rating: number;
  avatar: Types.ObjectId | null;
  evidence_note: string;
  is_featured: boolean;
  is_verified: boolean;
  is_published: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}
const testimonialSchema = new Schema<TestimonialAttrs>(
  {
    client_name: { type: String, required: true, trim: true, maxlength: 150 },
    client_role: { type: String, default: "", maxlength: 150 },
    company_name: { type: String, default: "", maxlength: 150 },
    content: { type: String, required: true },
    metric_value: { type: String, default: "", maxlength: 30 },
    metric_label: { type: String, default: "", maxlength: 120 },
    project: ref("Project"),
    rating: { type: Number, default: 5, min: 1, max: 5 },
    avatar: mediaRef,
    evidence_note: { type: String, default: "" },
    is_featured: { type: Boolean, default: false },
    // A client quote is only ever shown after the agency confirmed the client approved it.
    is_verified: { type: Boolean, default: false },
    is_published: { type: Boolean, default: false, index: true },
    order: orderField,
  },
  timestamps,
);
export const Testimonial = model<TestimonialAttrs>("Testimonial", testimonialSchema);

export interface TeamMemberAttrs {
  full_name: string;
  role_title: string;
  bio: string;
  avatar: Types.ObjectId | null;
  linkedin_url: string;
  order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}
const teamSchema = new Schema<TeamMemberAttrs>(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 150 },
    role_title: { type: String, required: true, trim: true, maxlength: 150 },
    bio: { type: String, default: "" },
    avatar: mediaRef,
    linkedin_url: { type: String, default: "" },
    order: orderField,
    is_published: { type: Boolean, default: false, index: true },
  },
  timestamps,
);
export const TeamMember = model<TeamMemberAttrs>("TeamMember", teamSchema);

export const BILLING = ["one_time", "monthly", "custom"] as const;
export const PRICING_VARIANTS = ["light", "highlight", "dark"] as const;

export interface PricingPlanAttrs {
  name: string;
  slug: string;
  description: string;
  price_amount: number | null;
  currency: (typeof CURRENCIES)[number];
  price_prefix: string;
  billing: (typeof BILLING)[number];
  badge: string;
  features: string[];
  icon_key: string;
  cta_label: string;
  cta_url: string;
  variant: (typeof PRICING_VARIANTS)[number];
  order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}
const pricingSchema = new Schema<PricingPlanAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    description: { type: String, default: "" },
    price_amount: { type: Number, default: null, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: "USD" },
    price_prefix: { type: String, default: "", maxlength: 40 },
    billing: { type: String, enum: BILLING, default: "custom" },
    badge: { type: String, default: "", maxlength: 40 },
    features: { type: [String], default: [] },
    icon_key: { type: String, enum: ICON_KEYS, default: "layers" },
    cta_label: { type: String, default: "Start a project", maxlength: 60 },
    cta_url: { type: String, default: "/contact", maxlength: 300 },
    variant: { type: String, enum: PRICING_VARIANTS, default: "light" },
    order: orderField,
    // Prices must be confirmed by the agency before they go public.
    is_published: { type: Boolean, default: false, index: true },
  },
  timestamps,
);
export const PricingPlan = model<PricingPlanAttrs>("PricingPlan", pricingSchema);

export interface ProcessStepAttrs {
  title: string;
  description: string;
  icon_key: string;
  image: Types.ObjectId | null;
  deliverables: string[];
  order: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}
const processSchema = new Schema<ProcessStepAttrs>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true },
    icon_key: { type: String, enum: ICON_KEYS, default: "compass" },
    image: mediaRef,
    deliverables: { type: [String], default: [] },
    order: orderField,
    is_published: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const ProcessStep = model<ProcessStepAttrs>("ProcessStep", processSchema);

export const CREDIBILITY_KINDS = ["capability", "stat", "award", "client_logo"] as const;
/** Statistics, awards and client logos are claims: public only when verified AND published. */
export const CLAIM_KINDS = ["stat", "award", "client_logo"] as const;

export interface CredibilityAttrs {
  kind: (typeof CREDIBILITY_KINDS)[number];
  value: string;
  title: string;
  description: string;
  icon_key: string;
  logo: Types.ObjectId | null;
  link_url: string;
  evidence_note: string;
  is_verified: boolean;
  is_published: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}
const credibilitySchema = new Schema<CredibilityAttrs>(
  {
    kind: { type: String, enum: CREDIBILITY_KINDS, default: "capability", index: true },
    value: { type: String, default: "", maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "" },
    icon_key: { type: String, enum: ICON_KEYS, default: "gem" },
    logo: mediaRef,
    link_url: { type: String, default: "", maxlength: 300 },
    evidence_note: { type: String, default: "" },
    is_verified: { type: Boolean, default: false },
    is_published: { type: Boolean, default: false, index: true },
    order: orderField,
  },
  timestamps,
);
export const CredibilityItem = model<CredibilityAttrs>("CredibilityItem", credibilitySchema);

// ---- navigation, socials, legal, form options ------------------------------------------------------
export const NAV_LOCATIONS = ["header", "footer_primary", "footer_secondary", "footer_legal"] as const;

export interface NavigationAttrs {
  location: (typeof NAV_LOCATIONS)[number];
  parent: Types.ObjectId | null;
  label: string;
  url: string;
  description: string;
  icon_key: string;
  badge: string;
  open_in_new_tab: boolean;
  is_cta: boolean;
  order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}
const navigationSchema = new Schema<NavigationAttrs>(
  {
    location: { type: String, enum: NAV_LOCATIONS, required: true, index: true },
    parent: ref("NavigationItem"),
    label: { type: String, required: true, trim: true, maxlength: 60 },
    url: { type: String, required: true, maxlength: 300 },
    description: { type: String, default: "", maxlength: 140 },
    icon_key: iconOrEmpty,
    badge: { type: String, default: "", maxlength: 20 },
    open_in_new_tab: { type: Boolean, default: false },
    is_cta: { type: Boolean, default: false },
    order: orderField,
    is_visible: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const NavigationItem = model<NavigationAttrs>("NavigationItem", navigationSchema);

export const PLATFORMS = ["linkedin", "x", "facebook", "instagram", "dribbble", "behance", "github", "youtube", "clutch", "upwork", "fiverr", "whatsapp", "other"] as const;

export interface SocialAttrs {
  platform: (typeof PLATFORMS)[number];
  label: string;
  url: string;
  order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}
const socialSchema = new Schema<SocialAttrs>(
  {
    platform: { type: String, enum: PLATFORMS, required: true },
    label: { type: String, default: "", maxlength: 60 },
    url: { type: String, required: true, maxlength: 300 },
    order: orderField,
    is_visible: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
export const SocialLink = model<SocialAttrs>("SocialLink", socialSchema);

export const LEGAL_STATUSES = ["draft", "published"] as const;
export interface LegalPageAttrs {
  slug: string;
  title: string;
  summary: string;
  body: Block[];
  status: (typeof LEGAL_STATUSES)[number];
  last_reviewed: Date | null;
  meta_title: string;
  meta_description: string;
  created_at: Date;
  updated_at: Date;
}
const legalSchema = new Schema<LegalPageAttrs>(
  {
    slug: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    summary: { type: String, default: "" },
    body: mixedList,
    status: { type: String, enum: LEGAL_STATUSES, default: "draft", index: true },
    last_reviewed: { type: Date, default: null },
    meta_title: { type: String, default: "", maxlength: 160 },
    meta_description: { type: String, default: "", maxlength: 255 },
  },
  timestamps,
);
export const LegalPage = model<LegalPageAttrs>("LegalPage", legalSchema);

export const FORM_KINDS = ["inquiry_topic", "budget_range", "timeline", "contact_method", "support_category"] as const;
export interface FormOptionAttrs {
  kind: (typeof FORM_KINDS)[number];
  value: string;
  label: string;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
const formOptionSchema = new Schema<FormOptionAttrs>(
  {
    kind: { type: String, enum: FORM_KINDS, required: true, index: true },
    value: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    order: orderField,
    is_active: { type: Boolean, default: true, index: true },
  },
  timestamps,
);
formOptionSchema.index({ kind: 1, value: 1 }, { unique: true });
export const FormOption = model<FormOptionAttrs>("FormOption", formOptionSchema);

// ---- where media files are used (for the media library) -------------------------------------------
const reg = (type: string, label: string, m: Parameters<typeof registerMediaRefs>[0]["model"], idFields: string[], titleOf: (d: Record<string, unknown>) => string, extra: Partial<Parameters<typeof registerMediaRefs>[0]> = {}) =>
  registerMediaRefs({ type, label, model: m, idFields, titleOf, ...extra });

reg("cms.siteprofile", "Site profile", SiteProfile, ["logo", "logo_on_dark", "favicon", "og_image"], (d) => String(d.agency_name));
reg("cms.cmspage", "Page", CMSPage, ["og_image"], (d) => String(d.title));
reg("cms.cmssection", "Page section", CMSSection, [], (d) => `${String(d.section_type)} #${String(d.order)}`, { stringFields: ["media_ids"] });
reg("cms.testimonial", "Testimonial", Testimonial, ["avatar"], (d) => String(d.client_name));
reg("cms.teammember", "Team member", TeamMember, ["avatar"], (d) => String(d.full_name));
reg("cms.processstep", "Process step", ProcessStep, ["image"], (d) => String(d.title));
reg("cms.credibilityitem", "Credibility item", CredibilityItem, ["logo"], (d) => String(d.title));
reg("cms.legalpage", "Legal page", LegalPage, [], (d) => String(d.title), { blockPaths: ["body.media_id"] });
