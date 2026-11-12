import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal marquee. Content is duplicated once (the copy is aria-hidden)
 * and translated by -50%. Stops entirely for reduced-motion users (globals.css).
 */
export function Ticker({
  items,
  className,
  itemClassName,
  speed = 40,
  label,
}: {
  items: ReactNode[];
  className?: string;
  itemClassName?: string;
  speed?: number;
  label?: string;
}) {
  if (!items.length) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i} className={cn("shrink-0", itemClassName)}>
          {item}
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("marquee-mask relative overflow-hidden", className)} aria-label={label} role={label ? "region" : undefined}>
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]" style={{ ["--marquee-duration" as string]: `${speed}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
