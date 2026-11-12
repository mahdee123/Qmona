import type { Metadata } from "next";
import { Reveal } from "@/components/ui/motion";
import { ContactDetails } from "@/components/sections/contact";
import { PageHero } from "@/components/sections/page-sections";
import { CtaCard } from "@/components/sections/shell";
import { ContactForm, type ContactInitial } from "@/features/inquiries/contact-form";
import { getFormOptions, getPage, getProject, getSite } from "@/lib/api";
import { firstParam, heroFor } from "@/lib/page-helpers";
import { buildMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getPage("contact")]);
  return buildMetadata({ site, title: page?.meta_title || "Start a Project", description: page?.meta_description, path: "/contact" });
}

export default async function ContactPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [site, options, page] = await Promise.all([getSite(), getFormOptions(), getPage("contact")]);

  // Preselect only values that exist in the backend-managed options.
  const pick = (value: string | undefined, allowed: string[]) => (value && allowed.includes(value) ? value : undefined);
  const initial: ContactInitial = {
    service: pick(firstParam(sp.service), options.services.map((s) => s.slug)),
    industry: pick(firstParam(sp.industry), options.industries.map((i) => i.slug)),
    product_type: pick(firstParam(sp.product_type), options.product_types.map((p) => p.slug)),
    topic: pick(firstParam(sp.topic), options.options.inquiry_topic.map((t) => t.value)),
  };
  const projectSlug = firstParam(sp.project);
  if (projectSlug && /^[a-z0-9-]{1,220}$/.test(projectSlug)) {
    const project = await getProject(projectSlug).catch(() => null);
    if (project) {
      initial.project = project.slug;
      initial.projectTitle = project.title;
      initial.service ??= project.services[0]?.slug;
      initial.industry ??= project.industries[0]?.slug;
    }
  }
  if ((initial.service || initial.project) && !initial.topic) {
    initial.topic = options.options.inquiry_topic.find((t) => t.value === "new-project")?.value;
  }

  return (
    <>
      <PageHero section={heroFor(page, { label: "Contact", headline: "Tell us about\nyour project.", subheadline: "Share a few details and we will get back to you by email." })} />
      <section className="container-q pb-20 tablet:pb-28" aria-label="Contact form">
        <div className="grid gap-6 desktop:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="flex flex-col gap-6 desktop:sticky desktop:top-28 desktop:self-start">
            <ContactDetails profile={site.profile} />
            <CtaCard title="Already a client?" text="Report an issue or request a change through the support form." cta={{ label: "Get Support", url: "/support" }} />
          </Reveal>
          <Reveal delay={0.1}>
            <ContactForm options={options} initial={initial} privacyNotice={site.profile.privacy_notice} source="/contact" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
