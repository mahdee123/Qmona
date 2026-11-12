import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Reference "← Go to Projects" pill link. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group/back inline-flex items-center gap-4 text-[1.0625rem] font-medium text-ink">
      <span className="inline-flex h-9 w-12 items-center justify-center rounded-full bg-card shadow-[var(--shadow-button)] transition-transform group-hover/back:-translate-x-1">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </span>
      {children}
    </Link>
  );
}

/** Reference project-meta item: icon circle + label + value. */
export function MetaItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="inline-flex h-12 w-14 shrink-0 items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-button)]">{icon}</span>
      <div>
        <p className="text-[0.875rem] text-muted">{label}</p>
        <p className="text-[1.0625rem] font-medium text-ink">{children}</p>
      </div>
    </div>
  );
}
