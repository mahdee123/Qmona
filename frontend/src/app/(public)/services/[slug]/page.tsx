import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { IconPill } from "@/components/ui/pill";
import { Paragraphs } from "@/components/ui/rich-text";
import { Headline, SectionHeading, SectionLabel } from "@/components/ui/section-heading";
import { BackLink } from "@/components/sections/back-link";
import { FaqBlock, faqJsonLd } from "@/components/sections/faq";
import { CtaCard, SectionShell } from "@/components/sections/shell";
import { ProjectCard } from "@/features/projects/project-card";
import { getFaqs, getProjects, getService, getSite } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, service] = await Promise.all([getSite(), getService(slug)]);
  if (!service) return { title: "Service not found" };
  return buildMetadata({
    site,
    title: service.meta_title || service.title,
    description: service.meta_description || service.short_description,
    path: `/services/${slug}`,
    image: service.cover_image,
  });
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const [service, site] = await Promise.all([getService(slug), getSite()]);
  if (!service) notFound();
  const [projects, faqs] = await Promise.all([getProjects({ services: [slug], page_size: 4 }), getFaqs({ service: slug })]);
  const contactHref = `/contact?service=${encodeURIComponent(slug)}`;

  return (
    <>
      <section className="container-q pb-12 pt-12 tablet:pt-20">
        <Reveal immediate y={20} className="flex flex-col gap-8">
          <BackLink href="/services">All services</BackLink>
          <div className="grid gap-8 desktop:grid-cols-[1.2fr_0.8fr] desktop:items-end">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <IconPill icon={service.icon_key} />
                {service.category && <SectionLabel>{service.category.name}</SectionLabel>}
              </div>
              <Headline as="h1" text={service.title} className="t-h1 max-w-[18ch]" />
              {service.tagline && <p className="t-lead max-w-2xl">{service.tagline}</p>}
            </div>
            <div className="flex flex-wrap gap-4 desktop:justify-end">
              <ButtonLink href={contactHref} size="lg" arrow>Start a Project</ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>

      <SectionShell>
        <div className="grid gap-10 desktop:grid-cols-2 desktop:gap-16">
          <Reveal className="space-y-6">
            <h2 className="t-h3">Overview</h2>
            <Paragraphs text={service.full_content || service.short_description} className="t-lead text-ink/80" />
            {service.deliverables.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="text-[1.25rem] font-medium tracking-[-0.03em]">What you get</h3>
                <ul className="space-y-3">
                  {service.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-3 text-[1.0625rem] text-ink">
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Check className="h-3 w-3" aria-hidden="true" /></span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
          {service.capabilities.length > 0 && (
            <Reveal delay={0.1}>
              <div className="panel p-3 tablet:p-4">
                <h2 className="px-3 pb-4 pt-2 text-[1.25rem] font-medium tracking-[-0.03em]">Capabilities</h2>
                <ul className="grid gap-3 tablet:grid-cols-2">
                  {service.capabilities.map((c, i) => (
                    <li key={c.id} className="flex flex-col gap-3 rounded-[20px] bg-card p-5 shadow-[var(--shadow-card)]">
                      <span className="text-[0.875rem] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">{c.title}</span>
                      {c.description && <span className="t-small">{c.description}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}
        </div>
      </SectionShell>

      {projects.results.length > 0 && (
        <SectionShell>
          <SectionHeading align="left" label="Related work" headline={`${service.title}\nin practice.`} action={<ButtonLink href={`/work?services=${slug}`} variant="secondary">View all</ButtonLink>} />
          <div className="panel mt-12 grid gap-x-6 gap-y-10 p-4 tablet:grid-cols-2 tablet:p-6">
            {projects.results.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </SectionShell>
      )}

      {faqs.length > 0 && (
        <SectionShell>
          <SectionHeading align="left" label="FAQ" headline={"Questions about\nthis service."} />
          <div className="mt-12">
            <FaqBlock faqs={faqs} content={{ side_title: "Still have a question?", side_text: "Ask us anything about scope, process or timelines.", cta: { label: "Contact Us", url: contactHref } }} />
          </div>
          <JsonLd data={faqJsonLd(faqs)} />
        </SectionShell>
      )}

      <section className="container-q py-10 tablet:py-14">
        <CtaCard tone="dark" title={`Need ${service.title.toLowerCase()}?`} text="Tell us about your project and we will reply with next steps." cta={{ label: "Start a Project", url: contactHref }} className="min-h-[16rem] rounded-[32px] tablet:p-10" />
      </section>

      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: service.title, path: `/services/${slug}` }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          description: service.short_description,
          url: absoluteUrl(`/services/${slug}`),
          provider: { "@type": "Organization", name: site.profile.agency_name },
          ...(service.capabilities.length ? { serviceOutput: service.capabilities.map((c) => c.title).join(", ") } : {}),
        }}
      />
    </>
  );
}
