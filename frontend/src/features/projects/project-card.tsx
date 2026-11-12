import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProjectListItem } from "@/types";
import { MediaImage } from "@/components/ui/media-image";
import { Tag } from "@/components/ui/pill";
import { roleClass, type SectionStyle } from "@/lib/section-style";
import { cn } from "@/lib/utils";

/** Reference project card: title + "View →" header, tag row, framed 4:3 image. */
export function ProjectCard({ project, priority, className, href: hrefOverride, style }: { project: ProjectListItem; priority?: boolean; className?: string; href?: string; style?: SectionStyle }) {
  const href = hrefOverride ?? `/work/${project.slug}`;
  const tags = [...project.services, ...project.product_types].slice(0, 3);
  return (
    <article className={cn("group/card relative flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-4 px-0.5">
        <div className="min-w-0 space-y-3">
          <h3 className={roleClass(style, "card_title", "text-[1.375rem] font-medium leading-tight tracking-[-0.035em] text-ink tablet:text-[1.5rem]")}>
            <Link href={href} className="after:absolute after:inset-0 after:z-10 after:rounded-[24px] focus-visible:outline-none">
              {project.title}
            </Link>
          </h3>
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Services">
              {tags.map((t) => (
                <li key={t.slug}><Tag>{t.name}</Tag></li>
              ))}
            </ul>
          )}
        </div>
        <span aria-hidden="true" className="mt-1 inline-flex shrink-0 items-center gap-3 text-[1.0625rem] font-medium text-ink">
          <span className="hidden tablet:inline">View</span>
          <span className="inline-flex h-8 w-12 items-center justify-center rounded-full bg-card shadow-[var(--shadow-button)] transition-transform duration-300 group-hover/card:translate-x-1">
            <ArrowRight className="h-4 w-4" />
          </span>
        </span>
      </div>
      <div className="frame transition-transform duration-500 ease-[var(--ease-reference)] group-hover/card:-translate-y-1 group-focus-within/card:ring-2 group-focus-within/card:ring-accent">
        <MediaImage
          media={project.thumbnail}
          alt={project.thumbnail?.alt_text || `${project.title} preview`}
          aspect="aspect-[4/3]"
          sizes="(min-width: 1200px) 680px, (min-width: 810px) 50vw, 100vw"
          priority={priority}
          className="transition-transform duration-700 ease-[var(--ease-reference)] group-hover/card:scale-[1.02]"
        />
      </div>
    </article>
  );
}
