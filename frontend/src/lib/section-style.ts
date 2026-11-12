import { cn } from "@/lib/utils";

/**
 * Preset-based section styling (ADR-018). The admin stores named presets per element role
 * (backend/apps/cms/section_schemas.py: STYLE_OPTIONS / STYLE_ROLES); this file is the only
 * place that maps them to classes. Every class is a complete static string so Tailwind can see it.
 */
export type StyleRole = "heading" | "subheading" | "card" | "card_title" | "card_text" | "button";
export type SectionStyle = Partial<Record<StyleRole, Partial<Record<StyleProp, string>>>>;
export type StyleProp = "size" | "weight" | "align" | "color" | "padding" | "radius" | "bg";

const PROPS: Record<StyleProp, Record<string, string>> = {
  size: {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl tablet:text-4xl",
    "4xl": "text-4xl tablet:text-6xl",
  },
  weight: { regular: "font-normal", medium: "font-medium", bold: "font-bold" },
  align: { left: "text-left", center: "text-center", right: "text-right" },
  color: { ink: "text-ink", body: "text-body", muted: "text-muted", white: "text-white" },
  // Padding presets repeat the `tablet:` value so they replace the responsive defaults too.
  padding: { sm: "p-4 tablet:p-4", md: "p-6 tablet:p-6", lg: "p-8 tablet:p-9" },
  radius: { none: "rounded-none", md: "rounded-xl", lg: "rounded-[24px]", xl: "rounded-[32px]" },
  bg: { card: "bg-card", panel: "bg-panel", page: "bg-page" },
};

/**
 * Default classes for a role, overridden by whatever the admin chose. With no style set it returns
 * `defaults` unchanged, so existing sections render exactly as before. `skip` leaves some props
 * alone where a component cannot honour them (e.g. a dark plan card keeps its own background).
 */
export function roleClass(
  style: SectionStyle | undefined,
  role: StyleRole,
  defaults?: string,
  skip: StyleProp[] = [],
): string {
  const chosen = style?.[role];
  if (!chosen) return defaults ?? "";
  const extra = (Object.keys(chosen) as StyleProp[])
    .filter((prop) => !skip.includes(prop))
    .map((prop) => PROPS[prop]?.[chosen[prop] ?? ""]);
  return cn(defaults, extra);
}

export function hasRoleStyle(style: SectionStyle | undefined, role: StyleRole, prop: StyleProp): boolean {
  return Boolean(style?.[role]?.[prop]);
}
