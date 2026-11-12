import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

/** Black icon pill with the heavy layered shadow used on reference cards. */
export function IconPill({ icon, className, size = "md" }: { icon?: string | null; className?: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-[var(--shadow-pill)]",
        size === "sm" ? "h-10 w-[3.75rem]" : "h-12 w-[4.5rem]",
        className,
      )}
    >
      <Icon name={icon} className={size === "sm" ? "h-[18px] w-[18px]" : "h-5 w-5"} />
    </span>
  );
}

export function NumberPill({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-20 items-center justify-center rounded-full bg-ink text-[1.375rem] font-medium tracking-[-0.03em] text-white shadow-[var(--shadow-pill)]",
        className,
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

export function Tag({ children, className, tone = "white" }: { children: ReactNode; className?: string; tone?: "white" | "gray" | "accent" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-4 py-[7px] text-[0.8125rem] font-medium leading-none tracking-[-0.005em]",
        tone === "white" && "bg-card text-ink shadow-[0_1px_2px_rgba(1,3,9,0.05)]",
        tone === "gray" && "bg-page text-body",
        tone === "accent" && "bg-accent text-white",
        tone === "dark" && "bg-white/10 text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-bold leading-4 text-white", className)}>
      {children}
    </span>
  );
}
