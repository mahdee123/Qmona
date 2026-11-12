import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered pagination that preserves the current query string. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );
  const item = "inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[0.9375rem] transition";
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(item, "bg-card shadow-[var(--shadow-button)]")} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Link>
      ) : (
        <span className={cn(item, "text-subtle")} aria-hidden="true"><ChevronLeft className="h-4 w-4" /></span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span aria-hidden="true" className="text-subtle">…</span>}
          {p === page ? (
            <span aria-current="page" className={cn(item, "bg-ink text-white")}>{p}</span>
          ) : (
            <Link href={href(p)} className={cn(item, "bg-card text-ink shadow-[var(--shadow-button)]")}>{p}</Link>
          )}
        </span>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} className={cn(item, "bg-card shadow-[var(--shadow-button)]")} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Link>
      ) : (
        <span className={cn(item, "text-subtle")} aria-hidden="true"><ChevronRight className="h-4 w-4" /></span>
      )}
    </nav>
  );
}
