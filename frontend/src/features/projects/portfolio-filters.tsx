"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { createContext, useContext, useEffect, useId, useState, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option = { slug: string; name: string };
type GroupKey = "services" | "industries" | "product_types";

const PendingContext = createContext(false);

function parse(v: string | null) {
  return (v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Portfolio filters. State lives in the URL (?services=a,b&industries=c&search=x&page=2)
 * so filtered views are shareable. The backend applies OR within a group and AND across groups.
 */
export function PortfolioFilters({
  groups,
  total,
  children,
}: {
  groups: { key: GroupKey; label: string; options: Option[] }[];
  total: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("search") || "");
  const [panelOpen, setPanelOpen] = useState(false);
  const panelId = useId();

  const selected: Record<GroupKey, string[]> = {
    services: parse(params.get("services")),
    industries: parse(params.get("industries")),
    product_types: parse(params.get("product_types")),
  };
  const activeCount = selected.services.length + selected.industries.length + selected.product_types.length + (params.get("search") ? 1 : 0);

  function push(next: URLSearchParams) {
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function toggle(key: GroupKey, slug: string) {
    const next = new URLSearchParams(params.toString());
    const cur = new Set(selected[key]);
    if (cur.has(slug)) cur.delete(slug);
    else cur.add(slug);
    if (cur.size) next.set(key, Array.from(cur).join(","));
    else next.delete(key);
    push(next);
  }

  function clearAll() {
    setSearch("");
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  // Debounced search → URL
  useEffect(() => {
    const current = params.get("search") || "";
    if (search.trim() === current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search.trim()) next.set("search", search.trim());
      else next.delete("search");
      push(next);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const [primary, ...secondary] = groups;

  return (
    <PendingContext.Provider value={pending}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
          <div role="group" aria-label={`Filter by ${primary.label.toLowerCase()}`} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 desktop:mx-0 desktop:flex-wrap desktop:px-0">
            <button
              type="button"
              aria-pressed={selected[primary.key].length === 0}
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.delete(primary.key);
                push(next);
              }}
              className={cn("shrink-0 rounded-full px-5 py-2.5 text-[0.9375rem] transition", selected[primary.key].length === 0 ? "bg-card text-ink shadow-[var(--shadow-button)]" : "text-body hover:text-ink")}
            >
              All
            </button>
            {primary.options.map((o) => {
              const on = selected[primary.key].includes(o.slug);
              return (
                <button
                  key={o.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(primary.key, o.slug)}
                  className={cn("shrink-0 rounded-full px-5 py-2.5 text-[0.9375rem] transition", on ? "bg-ink text-white" : "text-body hover:bg-card hover:text-ink")}
                >
                  {o.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 desktop:w-72 desktop:flex-none">
              <label htmlFor="portfolio-search" className="sr-only">Search projects</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="portfolio-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects…"
                maxLength={100}
                className="h-12 w-full rounded-full bg-card pl-11 pr-4 text-[0.9375rem] text-ink shadow-[var(--shadow-button)] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/15"
              />
            </div>
            <button
              type="button"
              aria-expanded={panelOpen}
              aria-controls={panelId}
              onClick={() => setPanelOpen((v) => !v)}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-card px-5 text-[0.9375rem] text-ink shadow-[var(--shadow-button)]"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
              {selected.industries.length + selected.product_types.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.75rem] text-white">
                  {selected.industries.length + selected.product_types.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div id={panelId} hidden={!panelOpen} className="rounded-[24px] bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="grid gap-6 desktop:grid-cols-2">
            {secondary.map((g) => (
              <fieldset key={g.key}>
                <legend className="mb-3 text-[0.875rem] font-medium text-body">{g.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const on = selected[g.key].includes(o.slug);
                    return (
                      <button
                        key={o.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(g.key, o.slug)}
                        className={cn("rounded-full px-4 py-2 text-[0.875rem] transition", on ? "bg-ink text-white" : "bg-page text-body hover:text-ink")}
                      >
                        {o.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
          <p className="text-[0.9375rem] text-body" role="status" aria-live="polite">
            {pending ? (
              <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Updating results…</span>
            ) : (
              <>{total} {total === 1 ? "project" : "projects"}{activeCount ? " match your filters" : ""}</>
            )}
          </p>
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink underline-offset-4 hover:underline">
              <X className="h-4 w-4" aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>

        {children}
      </div>
    </PendingContext.Provider>
  );
}

/** Dims the result grid while a filter navigation is in flight. */
export function PendingResults({ children }: { children: ReactNode }) {
  const pending = useContext(PendingContext);
  return (
    <div aria-busy={pending} className={cn("transition-opacity duration-300", pending && "pointer-events-none opacity-50")}>
      {children}
    </div>
  );
}

export function ClearFiltersButton() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button type="button" onClick={() => router.push(pathname)} className="rounded-full bg-ink px-6 py-3 text-[0.9375rem] text-white">
      Clear filters
    </button>
  );
}
