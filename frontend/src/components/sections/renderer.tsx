import type { ComponentType } from "react";
import type { Section } from "@/types";
import { BlogSection } from "./blog";
import { ContactSection } from "./contact";
import { CtaBannerSection } from "./cta-banner";
import { FaqSection } from "./faq";
import { FeaturedProjectSection } from "./featured-project";
import { HeroSection } from "./hero";
import { ImpactSection } from "./impact";
import { IndustriesSection, PageHero, RichTextSection, StorySection, TeamSection, ValuesSection } from "./page-sections";
import { PricingSection } from "./pricing";
import { ProcessSection } from "./process";
import { ProjectsSection } from "./projects";
import { ServicesSection } from "./services";
import { TestimonialsSection } from "./testimonials";
import { Ticker } from "@/components/ui/ticker";

function CapabilityTickerSection({ section }: { section: Section<{ items?: string[] }> }) {
  const items = section.content.items || [];
  if (!items.length) return null;
  return (
    <section className="container-q py-8" aria-label={section.label || "Capabilities"}>
      <Ticker
        label={section.label || "Capabilities"}
        items={items.map((t) => <span key={t} className="text-[1.25rem] font-bold tracking-[-0.03em] text-ink/40">{t}</span>)}
      />
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, ComponentType<{ section: Section<any> }>> = {
  hero: HeroSection,
  featured_project: FeaturedProjectSection,
  capability_ticker: CapabilityTickerSection,
  impact: ImpactSection,
  services: ServicesSection,
  projects: ProjectsSection,
  process: ProcessSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  faq: FaqSection,
  contact: ContactSection,
  blog: BlogSection,
  cta_banner: CtaBannerSection,
  page_hero: PageHero,
  story: StorySection,
  values: ValuesSection,
  team: TeamSection,
  industries: IndustriesSection,
  rich_text: RichTextSection,
};

/** Renders CMS sections in their configured order. Unknown types are skipped. */
export function SectionRenderer({ sections, skip = [] }: { sections: Section[]; skip?: string[] }) {
  return (
    <>
      {sections
        .filter((s) => !skip.includes(s.section_type))
        .map((section) => {
          const Cmp = REGISTRY[section.section_type];
          return Cmp ? <Cmp key={section.id} section={section} /> : null;
        })}
    </>
  );
}
