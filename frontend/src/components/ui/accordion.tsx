"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EASE_REFERENCE } from "./motion";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  leading?: ReactNode;
}

/**
 * Accessible single-open accordion (button + region, aria-expanded/controls).
 * `variant="pill"` mirrors the reference services list (icon pill + chevron);
 * `variant="faq"` mirrors the reference FAQ (+/− circle).
 */
export function Accordion({
  items,
  variant = "faq",
  defaultOpen,
  onChange,
  className,
}: {
  items: AccordionItem[];
  variant?: "faq" | "pill";
  defaultOpen?: string | null;
  onChange?: (id: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  const uid = useId();

  const toggle = (id: string) => {
    const next = open === id ? null : id;
    setOpen(next);
    onChange?.(next);
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => {
        const isOpen = open === item.id;
        const btnId = `${uid}-${item.id}-btn`;
        const panelId = `${uid}-${item.id}-panel`;
        return (
          <div
            key={item.id}
            className={cn(
              "rounded-[24px] bg-card transition-shadow duration-300",
              isOpen ? "shadow-[var(--shadow-card)]" : "shadow-[0_1px_2px_rgba(1,3,9,0.04)]",
            )}
          >
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-[24px] text-left",
                  variant === "pill" ? "p-3 pr-6" : "px-6 py-5",
                )}
              >
                {item.leading}
                <span
                  className={cn(
                    "flex-1",
                    variant === "pill"
                      ? "text-[1.25rem] font-medium tracking-[-0.03em] tablet:text-[1.5rem]"
                      : "text-[1.0625rem] font-medium tracking-[-0.01em]",
                  )}
                >
                  {item.title}
                </span>
                {variant === "pill" ? (
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("h-5 w-5 shrink-0 text-muted transition-transform duration-300", isOpen && "rotate-180")}
                  />
                ) : (
                  <span className="inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-full bg-page text-ink">
                    {isOpen ? <Minus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  </span>
                )}
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_REFERENCE }}
                  className="overflow-hidden"
                >
                  <div className="px-2 pb-2">
                    <div className="rounded-[18px] bg-page px-4 py-4 text-[0.9375rem] leading-relaxed text-body tablet:text-base">
                      {item.content}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
