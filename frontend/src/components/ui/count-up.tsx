"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts up the leading number of a value ("12", "1,500+", "GMT+6" stays as-is)
 * when it scrolls into view — the reference animates its stat numbers this way.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const match = /^(\d[\d,]*)(.*)$/.exec(value.trim());
  const target = match ? Number(match[1].replace(/,/g, "")) : null;
  const suffix = match ? match[2] : "";
  const [display, setDisplay] = useState(target !== null && !reduce ? "0" : value);

  useEffect(() => {
    if (target === null || reduce || !inView) {
      if (target !== null && (reduce || inView)) setDisplay(value);
      return;
    }
    const controls = animate(0, target, {
      duration: 1.4,
      ease: [0.62, 0, 0.41, 1],
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString("en-US") + suffix),
    });
    return () => controls.stop();
  }, [inView, reduce, target, suffix, value]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
