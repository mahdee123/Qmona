import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn, isExternal } from "@/lib/utils";

type Variant = "primary" | "secondary" | "dark" | "outline" | "light";
type Size = "md" | "lg" | "sm";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-3 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[transform,box-shadow,background-color,color] duration-300 ease-[var(--ease-reference)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent-light to-accent text-white shadow-[var(--shadow-accent)] ring-1 ring-inset ring-white/15 hover:shadow-[0_12px_28px_color-mix(in_srgb,var(--accent)_45%,transparent)]",
  secondary: "bg-card text-ink shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-card)] hover:-translate-y-px",
  dark: "bg-ink text-white shadow-[var(--shadow-button)] hover:bg-ink-deep hover:-translate-y-px",
  outline: "bg-transparent text-ink ring-1 ring-inset ring-line-strong hover:bg-card",
  light: "bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-[0.9375rem]",
  md: "h-12 px-6 text-base",
  lg: "h-[3.25rem] px-6 text-[1.0625rem]",
};

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
  /** Red/black pill with an inner white circle arrow, as on the reference CTAs. */
  arrow?: boolean;
  children: ReactNode;
  className?: string;
}

function Inner({ arrow, size, children }: { arrow?: boolean; size: Size; children: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      {arrow && (
        <span
          aria-hidden="true"
          className={cn(
            "-mr-3 inline-flex items-center justify-center rounded-full bg-white text-ink shadow-sm transition-transform duration-300 ease-[var(--ease-reference)] group-hover/btn:translate-x-0.5",
            size === "lg" ? "h-9 w-12" : size === "sm" ? "h-7 w-9" : "h-9 w-12",
          )}
        >
          <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      )}
    </>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  arrow,
  className,
  children,
  ...rest
}: ButtonOwnProps & { href: string } & Omit<ComponentProps<"a">, "href" | "children">) {
  const cls = cn(base, variants[variant], sizes[size], arrow && "pr-4", className);
  if (isExternal(href)) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        <Inner arrow={arrow} size={size}>{children}</Inner>
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      <Inner arrow={arrow} size={size}>{children}</Inner>
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  arrow,
  className,
  children,
  type = "button",
  ...rest
}: ButtonOwnProps & Omit<ComponentProps<"button">, "children">) {
  return (
    <button type={type} className={cn(base, variants[variant], sizes[size], arrow && "pr-4", className)} {...rest}>
      <Inner arrow={arrow} size={size}>{children}</Inner>
    </button>
  );
}

/** "View →" text link with a small white circle, used on project / blog cards. */
export function ArrowLink({ href, children, className, label }: { href: string; children?: ReactNode; className?: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn("group/al inline-flex items-center gap-3 text-[1.0625rem] font-medium tracking-[-0.01em] text-ink", className)}
    >
      {children}
      <span className="inline-flex h-8 w-12 items-center justify-center rounded-full bg-card shadow-[var(--shadow-button)] transition-transform duration-300 ease-[var(--ease-reference)] group-hover/al:translate-x-1">
        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );
}
