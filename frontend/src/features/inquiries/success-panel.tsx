"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { SubmitResult } from "./use-submit";

export function SuccessPanel({ result, onReset, kind }: { result: SubmitResult; onReset: () => void; kind: "contact" | "support" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="flex flex-col items-start gap-5 rounded-[28px] bg-card p-7 shadow-[var(--shadow-card)] outline-none tablet:p-9">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
        <CircleCheck className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h3 className="t-h3">{result.duplicate ? "Already received" : kind === "support" ? "Support request received" : "Thanks — message received"}</h3>
        <p className="t-body">{result.detail} The team will reply by email.</p>
        {result.reference && (
          <p className="text-[0.9375rem] text-ink">
            Your reference: <strong className="font-bold tracking-wide">{result.reference}</strong>
          </p>
        )}
      </div>
      <Button variant="secondary" onClick={onReset}>Send another message</Button>
    </div>
  );
}
