import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/motion";
import { IconPill } from "@/components/ui/pill";
import { Paragraphs } from "@/components/ui/rich-text";
import { Headline, SectionHeading, SectionLabel } from "@/components/ui/section-heading";
import { BackLink } from "@/components/sections/back-link";
import { CtaCard, SectionShell } from "@/components/sections/shell";
import { ProjectCard } from "@/features/projects/project-card";
import { ServiceCard } from "@/features/services/service-card";
import { getIndustry, getProjects, getServices, getSite } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, industry] = await Promise.all([getSite(), getIndustry(slug)]);
  if (!industry) return { title: "Industry not found" };
  return buildMetadata({ site, title: industry.meta_title || industry.name, description: industry.meta_description || industry.description, path: `/industries/${slug}`, image: industry.cover_image });
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const industry = await getIndustry(slug);
  if (!industry) notFound();
  const [projects, services] = await Promise.all([getProjects({ industries: [slug], page_size: 4 }), getServices(true)]);
  const contactHref = `/contact?industry=${encodeURIComponent(slug)}`;

  return (
    <>
      <section className="container-q pb-12 pt-12 tablet:pt-20">
        <Reveal immediate y={20} className="flex flex-col gap-8">
          <BackLink href="/industries">All industries</BackLink>
          <div className="grid gap-8 desktop:grid-cols-[1.2fr_0.8fr] desktop:items-end">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <IconPill icon={industry.icon_key} />
                <SectionLabel>Industry</SectionLabel>
              </div>
              <Headline as="h1" text={industry.name} className="t-h1 max-w-[18ch]" />
              {industry.description && <p className="t-lead max-w-2xl">{industry.description}</p>}
            </div>
            <div className="flex desktop:justify-end">
              <ButtonLink href={contactHref} size="lg" arrow>Discuss your project</ButtonLink>
            </div>
          </div>
        </Reveal>
        {industry.cover_image && (
          <Reveal delay={0.15} className="frame mt-12">
            <MediaImage media={industry.cover_image} aspect="aspect-[16/7]" sizes="100vw" priority />
          </Reveal>
        )}
      </section>

      {(industry.overview || industry.focus_areas.length > 0) && (
        <SectionShell>
          <div className="grid gap-10 desktop:grid-cols-2 desktop:gap-16">
            {industry.overview && (
              <Reveal className="space-y-6">
                <h2 className="t-h3">How we help</h2>
                <Paragraphs text={industry.overview} className="t-lead text-ink/80" />
              </Reveal>
            )}
            {industry.focus_areas.length > 0 && (
              <Reveal delay={0.1} className="panel p-3 tablet:p-4">
                <h2 className="px-3 pb-4 pt-2 text-[1.25rem] font-medium tracking-[-0.03em]">Typical needs we build for</h2>
                <ul className="space-y-3">
                  {industry.focus_areas.map((f) => (
                    <li key={f} className="flex items-start gap-3 rounded-[18px] bg-card px-4 py-3 text-[1.0625rem] text-ink shadow-[var(--shadow-card)]">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </SectionShell>
      )}

      {projects.results.length > 0 && (
        <SectionShell>
          <SectionHeading align="left" label="Related work" headline={`Projects in\n${industry.name}.`} action={<ButtonLink href={`/work?industries=${slug}`} variant="secondary">View all</ButtonLink>} />
          <div className="panel mt-12 grid gap-x-6 gap-y-10 p-4 tablet:grid-cols-2 tablet:p-6">
            {projects.results.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </SectionShell>
      )}

      {services.length > 0 && (
        <SectionShell>
          <SectionHeading align="left" label="Services" headline={"What we can\nbuild for you."} />
          <div className="mt-12 grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
            {services.map((s, i) => <Reveal key={s.id} delay={(i % 3) * 0.06}><ServiceCard service={s} /></Reveal>)}
          </div>
        </SectionShell>
      )}

      <section className="container-q py-10 tablet:py-14">
        <CtaCard tone="dark" title={`Building for ${industry.name.toLowerCase()}?`} text="Share what you need and we will suggest a practical first step." cta={{ label: "Start a Project", url: contactHref }} className="min-h-[16rem] rounded-[32px] tablet:p-10" />
      </section>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Industries", path: "/industries" }, { name: industry.name, path: `/industries/${slug}` }])} />
    </>
  );
}
