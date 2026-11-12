import type { ReactNode } from "react";
import { roleClass, type SectionStyle } from "@/lib/section-style";
import { cn, headlineLines } from "@/lib/utils";
import { Reveal } from "./motion";

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-3 text-base font-medium text-body", className)}>
      <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-accent" />
      {children}
    </p>
  );
}

/** Multi-line headline: each CMS line becomes its own block, as on the reference ("Line one.\nLine two."). */
export function Headline({
  text,
  as: Tag = "h2",
  className,
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const lines = headlineLines(text);
  return (
    <Tag className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </Tag>
  );
}

export function SectionHeading({
  label,
  headline,
  subheadline,
  align = "center",
  as = "h2",
  size = "h2",
  className,
  action,
  style,
}: {
  label?: string;
  headline: string;
  subheadline?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
  size?: "h1" | "h2" | "display";
  className?: string;
  action?: ReactNode;
  style?: SectionStyle;
}) {
  if (!headline && !label) return null;
  const chosenAlign = style?.heading?.align;
  const centered = chosenAlign ? chosenAlign === "center" : align === "center";
  const right = chosenAlign === "right";
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        centered ? "items-center text-center" : right ? "items-end text-right" : "items-start text-left",
        action && !centered && "tablet:flex-row tablet:items-end tablet:justify-between",
        className,
      )}
    >
      <Reveal className={cn("flex flex-col gap-5", centered ? "items-center" : right ? "items-end" : "items-start")} y={16}>
        {label && <SectionLabel>{label}</SectionLabel>}
        {headline && (
          <Headline
            as={as}
            text={headline}
            className={roleClass(
              style,
              "heading",
              cn(size === "display" ? "t-display" : size === "h1" ? "t-h1" : "t-h2", "max-w-[22ch]"),
              ["align"],
            )}
          />
        )}
        {subheadline && (
          <p className={roleClass(style, "subheading", cn("t-lead max-w-[38rem]", centered && "mx-auto"))}>{subheadline}</p>
        )}
      </Reveal>
      {action && (
        <Reveal y={16} delay={0.1} className="shrink-0">
          {action}
        </Reveal>
      )}
    </div>
  );
}
