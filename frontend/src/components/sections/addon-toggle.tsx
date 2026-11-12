"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Optional add-on row shown on a pricing plan (reference: "Add … +$1,000" with a switch). */
export function AddonToggle({ label, price }: { label: string; price: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative flex items-center justify-between gap-4 rounded-[18px] bg-card p-4 shadow-[var(--shadow-card)]">
      <div>
        <p className="text-[0.9375rem] text-ink">{label}</p>
        <p className="text-[0.9375rem] font-medium text-success">{price}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-panel")}
      >
        <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
      </button>
    </div>
  );
}
