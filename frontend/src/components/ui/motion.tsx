"use client";

import { MotionConfig, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { createContext, useContext, type ReactNode } from "react";
import type { SectionAnimation } from "@/types";

/**
 * Motion presets observed on the reference: opacity 0 → 1 with a 16–60px
 * upward offset, a spring (stiffness 66, damping 20) for hero elements and a
 * 0.6s tween with ease [0.62, 0, 0.41, 1] elsewhere. Editors can switch the
 * preset, duration (0.2–1.2s) and delay (0–1.5s) per section; reduced-motion
 * users always get static content.
 */

const AnimationContext = createContext<boolean>(true);

export function MotionProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return (
    <AnimationContext.Provider value={enabled}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </AnimationContext.Provider>
  );
}

export const EASE_REFERENCE = [0.62, 0, 0.41, 1] as const;

type Preset = SectionAnimation["preset"];

function initialFor(preset: Preset, y: number) {
  switch (preset) {
    case "fade":
      return { opacity: 0 };
    case "scale":
      return { opacity: 0, scale: 0.96 };
    case "none":
      return false as const;
    default:
      return { opacity: 0, y };
  }
}

interface RevealProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition"> {
  preset?: Preset;
  duration?: number;
  delay?: number;
  y?: number;
  spring?: boolean;
  /** Animate on mount (hero) instead of when scrolled into view. */
  immediate?: boolean;
  as?: "div" | "li" | "section" | "article" | "span";
  children: ReactNode;
}

export function Reveal({
  preset = "fade_up",
  duration = 0.6,
  delay = 0,
  y = 24,
  spring = false,
  immediate = false,
  as = "div",
  children,
  ...rest
}: RevealProps) {
  const globalEnabled = useContext(AnimationContext);
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (!globalEnabled || reduce || preset === "none") {
    const Plain = as as "div";
    const { className, style, id, role } = rest as { className?: string; style?: React.CSSProperties; id?: string; role?: string };
    return (
      <Plain className={className} style={style} id={id} role={role}>
        {children}
      </Plain>
    );
  }

  const initial = initialFor(preset, y);
  const target = { opacity: 1, y: 0, scale: 1 };
  const transition = spring
    ? { type: "spring" as const, stiffness: 66, damping: 20, mass: 1, delay }
    : { duration, delay, ease: EASE_REFERENCE };

  return (
    <Tag
      initial={initial}
      {...(immediate ? { animate: target } : { whileInView: target, viewport: { once: true, amount: 0.15 } })}
      transition={transition}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Applies a section's CMS animation settings to its content. */
export function SectionReveal({ animation, children, className }: { animation?: SectionAnimation; children: ReactNode; className?: string }) {
  if (!animation) return <Reveal className={className}>{children}</Reveal>;
  return (
    <Reveal
      className={className}
      preset={animation.enabled ? animation.preset : "none"}
      duration={animation.duration}
      delay={animation.delay}
    >
      {children}
    </Reveal>
  );
}
