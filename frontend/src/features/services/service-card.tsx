import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Industry, Service } from "@/types";
import { IconPill, Tag } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

/** Service card in the reference stat-card style (icon pill, title, copy, tags). */
export function ServiceCard({ service, index, className }: { service: Service; index?: number; className?: string }) {
  return (
    <article className={cn("group/svc relative flex h-full flex-col gap-6 rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)] transition-transform duration-500 ease-[var(--ease-reference)] hover:-translate-y-1 tablet:p-7", className)}>
      <div className="flex items-start justify-between">
        <IconPill icon={service.icon_key} />
        {index !== undefined && <span className="text-[0.9375rem] text-subtle">{String(index + 1).padStart(2, "0")}</span>}
      </div>
      <div className="space-y-3">
        <h3 className="t-h3">
          <Link href={`/services/${service.slug}`} className="after:absolute after:inset-0 after:z-10 after:rounded-[24px]">
            {service.title}
          </Link>
        </h3>
        <p className="t-body">{service.short_description}</p>
      </div>
      {service.capabilities.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${service.title} capabilities`}>
          {service.capabilities.slice(0, 4).map((c) => <li key={c.id}><Tag tone="gray">{c.title}</Tag></li>)}
        </ul>
      )}
      <span aria-hidden="true" className="mt-auto inline-flex items-center gap-3 text-[1rem] font-medium text-ink">
        Learn more
        <span className="inline-flex h-8 w-12 items-center justify-center rounded-full bg-page transition-transform duration-300 group-hover/svc:translate-x-1">
          <ArrowRight className="h-4 w-4" />
        </span>
      </span>
    </article>
  );
}

export function IndustryCard({ industry, className }: { industry: Industry; className?: string }) {
  return (
    <article className={cn("group/ind relative flex h-full flex-col gap-5 rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)] transition-transform duration-500 ease-[var(--ease-reference)] hover:-translate-y-1", className)}>
      <IconPill icon={industry.icon_key} size="sm" />
      <div className="space-y-2">
        <h3 className="t-h4">
          <Link href={`/industries/${industry.slug}`} className="after:absolute after:inset-0 after:z-10 after:rounded-[24px]">
            {industry.name}
          </Link>
        </h3>
        {industry.description && <p className="t-small">{industry.description}</p>}
      </div>
      {industry.projects_count > 0 && (
        <p className="mt-auto text-[0.8125rem] font-medium text-ink">
          {industry.projects_count} published {industry.projects_count === 1 ? "project" : "projects"}
        </p>
      )}
    </article>
  );
}
