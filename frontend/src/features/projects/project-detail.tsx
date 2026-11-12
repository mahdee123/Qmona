import { Building2, CalendarDays, FolderOpen, Rocket } from "lucide-react";
import type { GalleryItem, ProjectDetail, ProjectListItem } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/motion";
import { IconPill, Tag } from "@/components/ui/pill";
import { Paragraphs } from "@/components/ui/rich-text";
import { Headline, SectionHeading } from "@/components/ui/section-heading";
import { BackLink, MetaItem } from "@/components/sections/back-link";
import { CtaCard, SectionShell } from "@/components/sections/shell";
import { cn, formatMoney } from "@/lib/utils";
import { ProjectCard } from "./project-card";

function GalleryFigure({ item, className, aspect = "aspect-[4/3]" }: { item: GalleryItem; className?: string; aspect?: string }) {
  return (
    <figure className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-[28px] bg-panel">
        <MediaImage media={item.media} alt={item.alt_text || item.media.alt_text || item.caption} aspect={aspect} sizes="(min-width: 1200px) 860px, 100vw" />
      </div>
      {item.caption && <figcaption className="t-small px-2">{item.caption}</figcaption>}
    </figure>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-[1.625rem] font-bold tracking-[-0.04em]">{title}</h2>
      <Paragraphs text={body} className="t-body text-[1.0625rem]" />
    </div>
  );
}

export function ProjectDetailView({ project, related }: { project: ProjectDetail; related: ProjectListItem[] }) {
  const gallery = project.gallery;
  const sideA = gallery.slice(0, 2);
  const sideB = gallery.slice(2, 4);
  const rest = gallery.slice(4);
  const contactHref = `/contact?project=${encodeURIComponent(project.slug)}`;
  const live = project.external_links?.live_url;
  const repo = project.external_links?.repo_url;
  const services = project.services.map((s) => s.name).join(", ");
  const budget = project.budget;
  const budgetText = budget
    ? budget.min && budget.max
      ? `${formatMoney(budget.min, budget.currency)} – ${formatMoney(budget.max, budget.currency)}`
      : formatMoney(budget.min || budget.max, budget.currency)
    : "";

  return (
    <article>
      <header className="container-q pb-10 pt-12 tablet:pt-20">
        <Reveal immediate y={20} className="flex flex-col gap-8">
          <BackLink href="/work">Go to Projects</BackLink>
          <div className="flex flex-col gap-6 desktop:flex-row desktop:items-end desktop:justify-between">
            <div className="space-y-4">
              <Headline as="h1" text={project.title} className="t-h1 max-w-[20ch]" />
              {(project.tagline || project.summary) && <p className="t-lead max-w-2xl">{project.tagline || project.summary}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              {repo && <ButtonLink href={repo} variant="outline">View Code</ButtonLink>}
              {live && <ButtonLink href={live} variant="secondary">Preview Project</ButtonLink>}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            {project.client_name && <MetaItem icon={<Building2 className="h-5 w-5" aria-hidden="true" />} label="Company">{project.client_name}</MetaItem>}
            {project.timeline && <MetaItem icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />} label="Timeline">{project.timeline}</MetaItem>}
            {services && <MetaItem icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />} label="Service provided">{services}</MetaItem>}
            <MetaItem icon={<Rocket className="h-5 w-5" aria-hidden="true" />} label="Status">{project.delivery_status}</MetaItem>
          </div>
        </Reveal>
        {(project.cover_image || project.thumbnail) && (
          <Reveal delay={0.15} className="frame mt-10">
            <MediaImage
              media={project.cover_image || project.thumbnail}
              alt={(project.cover_image || project.thumbnail)?.alt_text || `${project.title} cover`}
              aspect="aspect-[4/3] tablet:aspect-[2/1]"
              sizes="100vw"
              priority
            />
          </Reveal>
        )}
      </header>

      {/* Challenge + gallery (reference: text column beside stacked images) */}
      {(project.challenge || sideA.length > 0) && (
        <section className="container-q py-12 tablet:py-16">
          <div className="grid gap-8 desktop:grid-cols-[0.62fr_1fr] desktop:gap-6">
            <Reveal className="desktop:sticky desktop:top-28 desktop:self-start">
              <TextBlock title="The Challenge" body={project.challenge || project.summary} />
              {project.qmona_role && (
                <div className="mt-8 rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)]">
                  <p className="text-[0.875rem] text-muted">Qmona&apos;s role</p>
                  <p className="mt-1 text-[1.0625rem] font-medium text-ink">{project.qmona_role}</p>
                </div>
              )}
            </Reveal>
            {sideA.length > 0 && (
              <div className="flex flex-col gap-6">
                {sideA.map((g) => <Reveal key={g.id}><GalleryFigure item={g} /></Reveal>)}
              </div>
            )}
          </div>
        </section>
      )}

      {(project.approach || project.solution) && (
        <section className="container-q py-12 tablet:py-16">
          <div className={cn("grid gap-8 desktop:gap-6", sideB.length ? "desktop:grid-cols-[1fr_0.62fr]" : "desktop:grid-cols-2")}>
            {sideB.length > 0 && (
              <div className="order-2 flex flex-col gap-6 desktop:order-1">
                {sideB.map((g) => <Reveal key={g.id}><GalleryFigure item={g} /></Reveal>)}
              </div>
            )}
            <Reveal className="order-1 space-y-12 desktop:sticky desktop:top-28 desktop:order-2 desktop:self-start">
              {project.approach && <TextBlock title="Our Approach" body={project.approach} />}
              {project.solution && <TextBlock title="The Solution" body={project.solution} />}
            </Reveal>
          </div>
        </section>
      )}

      {project.key_features.length > 0 && (
        <SectionShell>
          <SectionHeading align="left" label="Features" headline={"Key features\nwe delivered."} />
          <div className="panel mt-12 grid gap-4 p-3 tablet:grid-cols-2 tablet:p-4 desktop:grid-cols-3">
            {project.key_features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <div className="flex h-full flex-col gap-6 rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)]">
                  <IconPill icon="check-circle" size="sm" />
                  <div className="space-y-2">
                    <h3 className="text-[1.25rem] font-medium tracking-[-0.03em]">{f.title}</h3>
                    {f.description && <p className="t-small">{f.description}</p>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </SectionShell>
      )}

      {project.case_study_sections.map((s, i) => (
        <section key={`${s.heading}-${i}`} className="container-q py-10 tablet:py-14">
          <Reveal className="grid gap-6 desktop:grid-cols-[0.62fr_1fr]">
            <h2 className="text-[1.625rem] font-bold tracking-[-0.04em]">{s.heading}</h2>
            <Paragraphs text={s.body} className="t-body text-[1.0625rem]" />
          </Reveal>
        </section>
      ))}

      {rest.length > 0 && (
        <section className="container-q py-10 tablet:py-14" aria-label="Gallery">
          <div className="grid gap-6 tablet:grid-cols-2">
            {rest.map((g) => (
              <Reveal key={g.id} className={g.layout === "full" ? "tablet:col-span-2" : undefined}>
                <GalleryFigure item={g} aspect={g.layout === "full" ? "aspect-[16/9]" : "aspect-[4/3]"} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {(project.verified_results.length > 0 || project.testimonial || budgetText || project.technologies.length > 0) && (
        <section className="container-q py-10 tablet:py-14">
          <div className="panel grid gap-4 p-3 tablet:p-4 desktop:grid-cols-2">
            {project.verified_results.length > 0 && (
              <Reveal className="rounded-[24px] bg-ink-deep p-7 text-white">
                <p className="text-[0.875rem] text-white/60">Verified outcomes</p>
                <dl className="mt-6 grid gap-6 tablet:grid-cols-2">
                  {project.verified_results.map((r) => (
                    <div key={r.label}>
                      <dt className="sr-only">{r.label}</dt>
                      <dd className="text-[2.5rem] font-medium leading-none tracking-[-0.05em]">{r.value}</dd>
                      <dd className="mt-2 text-[1rem] text-white/75">{r.label}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
            {project.testimonial && (
              <Reveal as="div" className="rounded-[24px] bg-card p-7 shadow-[var(--shadow-card)]">
                <figure className="space-y-5">
                  <blockquote className="text-[1.25rem] font-medium leading-snug tracking-[-0.02em] text-ink">“{project.testimonial.content}”</blockquote>
                  <figcaption className="t-small">
                    — {project.testimonial.client_name}
                    {project.testimonial.client_role ? `, ${project.testimonial.client_role}` : ""}
                    {project.testimonial.company_name ? `, ${project.testimonial.company_name}` : ""}
                  </figcaption>
                </figure>
              </Reveal>
            )}
            {(budgetText || project.technologies.length > 0) && (
              <Reveal className="space-y-6 rounded-[24px] bg-card p-7 shadow-[var(--shadow-card)]">
                {budgetText && (
                  <div>
                    <p className="t-small">Project budget</p>
                    <p className="mt-1 text-[1.5rem] font-medium tracking-[-0.03em]">{budgetText}</p>
                  </div>
                )}
                {project.technologies.length > 0 && (
                  <div>
                    <p className="t-small mb-3">Technologies</p>
                    <ul className="flex flex-wrap gap-2">
                      {project.technologies.map((t) => <li key={t.slug}><Tag tone="gray">{t.name}</Tag></li>)}
                    </ul>
                  </div>
                )}
              </Reveal>
            )}
          </div>
        </section>
      )}

      <section className="container-q py-10 tablet:py-14">
        <CtaCard
          tone="dark"
          title="Want something similar?"
          text={`Tell us about your idea and mention ${project.title} — we will reply with next steps.`}
          cta={{ label: "Start a Project", url: contactHref }}
          className="min-h-[16rem] rounded-[32px] tablet:p-10"
        />
      </section>

      {related.length > 0 && (
        <SectionShell>
          <SectionHeading align="left" label="More work" headline={"More projects.\nBuilt with care."} action={<ButtonLink href="/work" variant="secondary">More Projects</ButtonLink>} />
          <div className="panel mt-12 grid gap-x-6 gap-y-10 p-4 tablet:grid-cols-2 tablet:p-6">
            {related.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </SectionShell>
      )}
    </article>
  );
}
