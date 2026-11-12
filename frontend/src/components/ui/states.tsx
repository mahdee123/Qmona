import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-16 text-center shadow-[var(--shadow-card)]", className)}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-page text-muted">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <p className="t-h4">{title}</p>
        {description && <p className="t-body mx-auto max-w-md">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }: { title?: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-16 text-center shadow-[var(--shadow-card)]", className)}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <CircleAlert className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <p className="t-h4">{title}</p>
        {description && <p className="t-body mx-auto max-w-md">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[24px] bg-panel", className)} aria-hidden="true" />;
}
