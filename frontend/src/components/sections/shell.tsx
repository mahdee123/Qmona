import type { ReactNode } from "react";
import type { Link as CtaLink } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { roleClass, type SectionStyle } from "@/lib/section-style";
import { cn } from "@/lib/utils";

/** Section wrapper with the reference's dashed top divider and vertical rhythm. */
export function SectionShell({
  id,
  children,
  className,
  divider = true,
  tight = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  divider?: boolean;
  tight?: boolean;
}) {
  return (
    <section id={id} className={cn("container-q relative", className)}>
      {divider && <div className="dash-x" aria-hidden="true" />}
      <div className={cn(tight ? "py-10 tablet:py-14" : "py-16 tablet:py-24 desktop:py-28")}>{children}</div>
    </section>
  );
}

/** Gray "Let's start building" card with halftone corner (reference CTA card). */
export function CtaCard({
  title,
  text,
  cta,
  className,
  tone = "light",
  ctaVariant,
  style,
}: {
  title?: string;
  text?: string;
  cta?: CtaLink | null;
  className?: string;
  tone?: "light" | "dark";
  ctaVariant?: "dark" | "primary";
  style?: SectionStyle;
}) {
  if (!title && !cta) return null;
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        roleClass(
          style,
          "card",
          "relative flex min-h-[15rem] flex-col justify-between gap-8 overflow-hidden rounded-[24px] p-6 tablet:p-7",
          ["bg"],
        ),
        dark ? "bg-ink-deep text-white" : "bg-panel text-ink",
        className,
      )}
    >
      <div aria-hidden="true" className={cn("halftone absolute inset-0", dark ? "text-accent/70" : "text-ink/25")} />
      <div className="relative max-w-md space-y-3">
        {title && (
          <h3 className={roleClass(style, "card_title", "text-[1.75rem] font-bold leading-tight tracking-[-0.045em] tablet:text-[2rem]")}>
            {title}
          </h3>
        )}
        {text && (
          <p className={roleClass(style, "card_text", cn("text-[1.0625rem] leading-snug", dark ? "text-white/70" : "text-body"))}>
            {text}
          </p>
        )}
      </div>
      {cta && (
        <div className="relative flex justify-end">
          <ButtonLink href={cta.url} className={roleClass(style, "button")} variant={ctaVariant || (dark ? "primary" : "dark")} arrow={dark || ctaVariant === "primary"}>
            {cta.label}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
