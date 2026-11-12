import { Types } from "mongoose";
import { ApiError } from "../../errors/api-error.js";
import { ICON_KEYS } from "../../lib/icons.js";
import { isSafeUrl } from "../../lib/urls.js";
import { MediaAsset } from "../media/media.model.js";
import { SECTION_TYPES } from "./cms.model.js";

/**
 * Content schemas for CMS section types.
 * Each section type declares the keys allowed in `content_data`, their types and limits, and the layout
 * variants it supports. Unknown keys are rejected so the stored JSON always matches what the frontend
 * components know how to render.
 */
type Spec =
  | { t: "str"; max: number }
  | { t: "text"; max: number }
  | { t: "bool" }
  | { t: "int"; min: number; max: number }
  | { t: "url" }
  | { t: "link" }
  | { t: "media" }
  | { t: "media_list"; max: number }
  | { t: "str_list"; max: number; itemMax: number }
  | { t: "obj_list"; max: number; fields: Record<string, Spec> }
  | { t: "icon" }
  | { t: "slug" };

const S = (max = 200): Spec => ({ t: "str", max });
const T = (max = 2000): Spec => ({ t: "text", max });
const LINK: Spec = { t: "link" };
const BOOL: Spec = { t: "bool" };
const MEDIA: Spec = { t: "media" };
const ICON: Spec = { t: "icon" };
const SLUG: Spec = { t: "slug" };
const INT = (min: number, max: number): Spec => ({ t: "int", min, max });
const STR_LIST = (max: number, itemMax = 120): Spec => ({ t: "str_list", max, itemMax });
const MEDIA_LIST = (max: number): Spec => ({ t: "media_list", max });
const OBJ_LIST = (max: number, fields: Record<string, Spec>): Spec => ({ t: "obj_list", max, fields });

export const SECTION_SCHEMAS: Record<string, { variants: string[]; fields: Record<string, Spec> }> = {
  hero: {
    variants: ["centered"],
    fields: {
      primary_cta: LINK, secondary_cta: LINK, ticker_label: S(80), show_capability_ticker: BOOL, show_side_cards: BOOL,
      show_trusted_by: BOOL, trusted_by_label: S(80), show_project_card: BOOL,
    },
  },
  featured_project: { variants: ["default"], fields: { project_slug: SLUG, cta_label: S(40) } },
  capability_ticker: { variants: ["default"], fields: { items: STR_LIST(40, 60) } },
  impact: { variants: ["centered"], fields: { cta_title: S(80), cta_text: T(300), cta: LINK, max_items: INT(1, 12) } },
  services: { variants: ["split", "default"], fields: { cta: LINK, image: MEDIA, open_first: BOOL } },
  projects: { variants: ["centered", "default"], fields: { limit: INT(2, 12), cta: LINK, featured_only: BOOL, show_sample_content: BOOL } },
  process: { variants: ["centered"], fields: { cta_title: S(80), cta_text: T(300), cta: LINK } },
  pricing: { variants: ["centered"], fields: { note: T(400), show_sample_content: BOOL, cta_title: S(80), cta_text: T(300), cta: LINK } },
  testimonials: {
    variants: ["centered"],
    fields: { limit: INT(1, 12), cta: LINK, show_sample_content: BOOL, cta_title: S(80), cta_text: T(300), cta_button: LINK },
  },
  faq: { variants: ["split"], fields: { side_title: S(80), side_text: T(300), cta: LINK, limit: INT(1, 20) } },
  contact: { variants: ["split"], fields: { form_title: S(80), show_form: BOOL } },
  blog: { variants: ["default"], fields: { limit: INT(1, 6), cta: LINK } },
  cta_banner: { variants: ["light", "dark"], fields: { primary_cta: LINK, secondary_cta: LINK, show_capability_ticker: BOOL } },
  page_hero: { variants: ["centered", "default"], fields: { images: MEDIA_LIST(3), primary_cta: LINK, secondary_cta: LINK } },
  story: { variants: ["split", "default"], fields: { body: T(4000), points: STR_LIST(12, 200), cta: LINK, image: MEDIA } },
  values: { variants: ["default", "centered"], fields: { items: OBJ_LIST(12, { title: S(80), text: T(400), icon: ICON }) } },
  team: { variants: ["default"], fields: { hiring_title: S(80), hiring_text: T(300), hiring_cta: LINK } },
  industries: { variants: ["default", "centered"], fields: { cta: LINK, limit: INT(1, 24) } },
  rich_text: { variants: ["default", "centered"], fields: { body: T(8000), cta: LINK } },
};

class ContentError extends Error {}

async function validateValue(spec: Spec, value: unknown, path: string): Promise<unknown> {
  if (value === null || value === undefined) return null;
  switch (spec.t) {
    case "str":
    case "text":
      if (typeof value !== "string") throw new ContentError(`${path}: must be text.`);
      if (value.length > spec.max) throw new ContentError(`${path}: max ${spec.max} characters.`);
      return value.trim();
    case "bool":
      if (typeof value !== "boolean") throw new ContentError(`${path}: must be true or false.`);
      return value;
    case "int":
      if (typeof value !== "number" || !Number.isInteger(value) || value < spec.min || value > spec.max) {
        throw new ContentError(`${path}: must be a whole number between ${spec.min} and ${spec.max}.`);
      }
      return value;
    case "url":
      if (value && !isSafeUrl(value)) throw new ContentError(`${path}: enter an internal path ("/contact") or an http(s) URL.`);
      return value;
    case "link": {
      if (typeof value !== "object" || Array.isArray(value)) throw new ContentError(`${path}: must be {"label", "url"}.`);
      const v = value as Record<string, unknown>;
      const unknown = Object.keys(v).filter((k) => k !== "label" && k !== "url");
      if (unknown.length) throw new ContentError(`${path}: unknown keys ${JSON.stringify(unknown.sort())}.`);
      const label = ((await validateValue(S(40), v.label ?? "", `${path}.label`)) as string) || "";
      const url = typeof v.url === "string" ? v.url : "";
      if (url && !isSafeUrl(url)) throw new ContentError(`${path}.url: enter an internal path or an http(s) URL.`);
      if (Boolean(label) !== Boolean(url)) throw new ContentError(`${path}: provide both a label and a URL, or neither.`);
      return label ? { label, url } : null;
    }
    case "media": {
      if (typeof value !== "string" || !Types.ObjectId.isValid(value) || value.length !== 24) throw new ContentError(`${path}: invalid media id.`);
      if (!(await MediaAsset.exists({ _id: value }))) throw new ContentError(`${path}: media not found.`);
      return value;
    }
    case "media_list":
      if (!Array.isArray(value) || value.length > spec.max) throw new ContentError(`${path}: up to ${spec.max} images.`);
      return Promise.all(value.map((v, i) => validateValue(MEDIA, v, `${path}[${i}]`)));
    case "str_list":
      if (!Array.isArray(value) || value.length > spec.max) throw new ContentError(`${path}: up to ${spec.max} entries.`);
      return Promise.all(value.filter(Boolean).map((v, i) => validateValue(S(spec.itemMax), v, `${path}[${i}]`)));
    case "obj_list":
      if (!Array.isArray(value) || value.length > spec.max) throw new ContentError(`${path}: up to ${spec.max} items.`);
      return Promise.all(value.map((v, i) => validateFields(spec.fields, v, `${path}[${i}]`)));
    case "icon":
      if (value && !(ICON_KEYS as readonly string[]).includes(String(value))) throw new ContentError(`${path}: unknown icon.`);
      return value;
    case "slug":
      if (typeof value !== "string" || value.length > 220) throw new ContentError(`${path}: invalid slug.`);
      return value.trim();
  }
}

async function validateFields(fields: Record<string, Spec>, data: unknown, path = "content"): Promise<Record<string, unknown>> {
  if (data === null || data === undefined || data === "") return {};
  if (typeof data !== "object" || Array.isArray(data)) throw new ContentError(`${path}: must be an object.`);
  const unknown = Object.keys(data).filter((k) => !(k in fields));
  if (unknown.length) throw new ContentError(`${path}: unknown fields ${JSON.stringify(unknown.sort())}.`);
  const cleaned: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(fields)) {
    if (!(key in (data as object))) continue;
    const v = await validateValue(spec, (data as Record<string, unknown>)[key], `${path}.${key}`);
    const empty = v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (!empty) cleaned[key] = v;
  }
  return cleaned;
}

export async function validateSectionContent(sectionType: string, variant: string, content: unknown): Promise<Record<string, unknown>> {
  const schema = SECTION_SCHEMAS[sectionType];
  if (!schema) throw ApiError.fieldError("section_type", "Unknown section type.");
  if (!schema.variants.includes(variant)) throw ApiError.fieldError("variant", `Allowed variants for this section: ${JSON.stringify(schema.variants)}.`);
  try {
    return await validateFields(schema.fields, content);
  } catch (err) {
    if (err instanceof ContentError) throw ApiError.fieldError("content_data", err.message);
    throw err;
  }
}

/** All media ids referenced by a section's content (for public resolution and usage tracking). */
export function collectMediaIds(sectionType: string, content: Record<string, unknown> | undefined): string[] {
  const fields = SECTION_SCHEMAS[sectionType]?.fields ?? {};
  const ids: string[] = [];
  for (const [key, spec] of Object.entries(fields)) {
    const v = content?.[key];
    if (spec.t === "media" && typeof v === "string") ids.push(v);
    else if (spec.t === "media_list" && Array.isArray(v)) ids.push(...v.filter((x): x is string => typeof x === "string"));
  }
  return ids;
}

// ---------------------------------------------------------------------------------------------------
// Per-section style presets. No arbitrary CSS: every value is a named preset that the frontend maps to
// static classes in lib/section-style.ts.
// ---------------------------------------------------------------------------------------------------
export const STYLE_OPTIONS: Record<string, string[]> = {
  size: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"],
  weight: ["regular", "medium", "bold"],
  align: ["left", "center", "right"],
  color: ["ink", "body", "muted", "white"],
  padding: ["sm", "md", "lg"],
  radius: ["none", "md", "lg", "xl"],
  bg: ["card", "panel", "page"],
};
const TEXT_PROPS = ["size", "weight", "align", "color"];
export const STYLE_ROLES: Record<string, string[]> = {
  heading: TEXT_PROPS,
  subheading: TEXT_PROPS,
  card: ["padding", "radius", "bg"],
  card_title: TEXT_PROPS,
  card_text: TEXT_PROPS,
  button: ["size", "weight"],
};
const HEAD = ["heading", "subheading"];
const CARDS = ["card", "card_title", "card_text"];
/** Roles each section type actually renders (keep in sync with the frontend renderers). Others are rejected. */
export const SECTION_STYLE_ROLES: Record<string, string[]> = {
  hero: [...HEAD, "button"],
  featured_project: [],
  capability_ticker: [],
  impact: [...HEAD, ...CARDS, "button"],
  services: [...HEAD, "button"],
  projects: [...HEAD, "card_title", "button"],
  process: [...HEAD, ...CARDS, "button"],
  pricing: [...HEAD, ...CARDS, "button"],
  testimonials: [...HEAD, ...CARDS, "button"],
  faq: [...HEAD, ...CARDS, "button"],
  contact: [...HEAD],
  blog: [...HEAD, "button"],
  cta_banner: [...HEAD, "button"],
  page_hero: [...HEAD, "button"],
  story: [...HEAD, "button"],
  values: [...HEAD, ...CARDS],
  team: [...HEAD, ...CARDS, "button"],
  industries: [...HEAD, "button"],
  rich_text: [...HEAD, "button"],
};

export function validateStyle(sectionType: string, style: unknown): Record<string, Record<string, string>> {
  if (style === null || style === undefined || style === "") return {};
  if (typeof style !== "object" || Array.isArray(style)) throw ApiError.fieldError("style", "Must be an object.");
  const allowed = SECTION_STYLE_ROLES[sectionType] ?? [];
  const cleaned: Record<string, Record<string, string>> = {};
  for (const [role, props] of Object.entries(style as Record<string, unknown>)) {
    if (!(role in STYLE_ROLES) || !allowed.includes(role)) throw ApiError.fieldError("style", `"${role}" cannot be styled in a ${sectionType} section.`);
    if (typeof props !== "object" || props === null || Array.isArray(props)) throw ApiError.fieldError("style", `${role}: must be an object.`);
    const out: Record<string, string> = {};
    for (const [prop, value] of Object.entries(props)) {
      if (!STYLE_ROLES[role]!.includes(prop)) throw ApiError.fieldError("style", `${role}: unknown option "${prop}".`);
      if (value === null || value === undefined || value === "") continue;
      if (!STYLE_OPTIONS[prop]!.includes(String(value))) throw ApiError.fieldError("style", `${role}.${prop}: choose one of ${JSON.stringify(STYLE_OPTIONS[prop])}.`);
      out[prop] = String(value);
    }
    if (Object.keys(out).length) cleaned[role] = out;
  }
  return cleaned;
}

export function styleSchemaDescription() {
  return { options: STYLE_OPTIONS, roles: STYLE_ROLES, section_roles: SECTION_STYLE_ROLES };
}

function describe(spec: Spec): Record<string, unknown> {
  const d: Record<string, unknown> = { type: spec.t };
  if (spec.t === "str" || spec.t === "text") d.max_length = spec.max;
  else if (spec.t === "int") Object.assign(d, { min: spec.min, max: spec.max });
  else if (spec.t === "str_list" || spec.t === "media_list") d.max_items = spec.max;
  else if (spec.t === "obj_list") {
    d.max_items = spec.max;
    d.fields = Object.fromEntries(Object.entries(spec.fields).map(([k, v]) => [k, describe(v)]));
  }
  return d;
}

/** Machine-readable schema for the admin form builder. */
export function schemaDescription() {
  return Object.fromEntries(
    Object.entries(SECTION_SCHEMAS).map(([type, s]) => [
      type,
      { variants: s.variants, fields: Object.fromEntries(Object.entries(s.fields).map(([k, v]) => [k, describe(v)])) },
    ]),
  );
}

export const SECTION_TYPE_LABELS: Record<(typeof SECTION_TYPES)[number], string> = {
  hero: "Hero", featured_project: "Featured Project", capability_ticker: "Capability Ticker", impact: "Impact / Credibility",
  services: "Services", projects: "Selected Projects", process: "Delivery Process", pricing: "Pricing", testimonials: "Testimonials",
  faq: "FAQ", contact: "Contact", blog: "Blog Articles", cta_banner: "Call-to-Action Banner", page_hero: "Page Hero",
  story: "Story", values: "Values / Principles", team: "Team", industries: "Industries", rich_text: "Rich Text",
};
