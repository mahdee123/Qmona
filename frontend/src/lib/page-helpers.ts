import "server-only";

import type { CMSPage, Section } from "@/types";

const DEFAULT_ANIMATION = { enabled: true, preset: "fade_up" as const, duration: 0.6, delay: 0 };

/** Returns the page_hero section of a CMS page, falling back to code defaults. */
export function heroFor(page: CMSPage | null, fallback: { label?: string; headline: string; subheadline?: string }): Section {
  const found = page?.sections.find((s) => s.section_type === "page_hero");
  if (found) return found;
  return {
    id: "fallback-hero",
    section_type: "page_hero",
    variant: "centered",
    label: fallback.label || "",
    headline: fallback.headline,
    subheadline: fallback.subheadline || "",
    content: {},
    animation: DEFAULT_ANIMATION,
    order: 0,
  };
}

/** All sections except the page hero (rendered below listing content). */
export function bodySections(page: CMSPage | null) {
  return (page?.sections || []).filter((s) => s.section_type !== "page_hero");
}

export function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function listParam(v: string | string[] | undefined) {
  const raw = Array.isArray(v) ? v.join(",") : v || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
}
