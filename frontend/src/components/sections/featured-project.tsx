import Image from "next/image";
import type { Section } from "@/types";
import { ArrowLink } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { SectionReveal } from "@/components/ui/motion";
import { getProject, getProjects } from "@/lib/api";

/** Reference "featured project" panel: title + result line, View Project link, large framed image with thumbnails. */
export async function FeaturedProjectSection({ section }: { section: Section<{ project_slug?: string; cta_label?: string }> }) {
  let slug = section.content.project_slug;
  if (!slug) {
    const featured = await getProjects({ featured: true, page_size: 1 });
    slug = featured.results[0]?.slug;
  }
  if (!slug) return null;
  const project = await getProject(slug);
  if (!project) return null;

  const result = project.verified_results[0];
  const subline = result ? `${result.value} ${result.label}` : project.tagline || project.summary;
  const thumbs = project.gallery.slice(0, 3);
  const cover = project.cover_image || project.thumbnail;

  return (
    <section className="container-q pb-16 tablet:pb-24" aria-labelledby="featured-project-title">
      <SectionReveal animation={section.animation}>
        <div className="rounded-[32px] bg-card p-2 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-5 tablet:flex-row tablet:items-start tablet:justify-between tablet:px-6">
            <div className="space-y-2">
              <h2 id="featured-project-title" className="text-[1.625rem] font-medium leading-tight tracking-[-0.04em] tablet:text-[2rem]">
                {project.title}
              </h2>
              {subline && <p className="text-[1.0625rem] text-muted">{subline}</p>}
            </div>
            <ArrowLink href={`/work/${project.slug}`} className="shrink-0">
              {section.content.cta_label || "View Project"}
            </ArrowLink>
          </div>
          <div className="relative overflow-hidden rounded-[26px]">
            <MediaImage media={cover} alt={cover?.alt_text || project.title} aspect="aspect-[4/3] tablet:aspect-[16/9]" sizes="(min-width: 1440px) 1376px, 100vw" priority />
            {thumbs.length > 0 && (
              <ul className="absolute bottom-3 left-3 hidden gap-2 tablet:flex" aria-label="More views">
                {thumbs.map((g) => (
                  <li key={g.id} className="relative h-24 w-36 overflow-hidden rounded-[16px] shadow-[var(--shadow-card)] ring-2 ring-white/60">
                    <Image src={g.media.url} alt={g.alt_text || g.caption || ""} fill sizes="144px" className="object-cover" unoptimized={g.media.mime_type === "image/svg+xml"} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
