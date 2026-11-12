import type { Link, Media, Section } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { SectionReveal } from "@/components/ui/motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { getServices } from "@/lib/api";
import { ServicesAccordion } from "./services-accordion";
import { SectionShell } from "./shell";
import { roleClass } from "@/lib/section-style";

export async function ServicesSection({ section }: { section: Section<{ cta?: Link; image?: Media; open_first?: boolean }> }) {
  const services = await getServices(true);
  if (!services.length) return null;
  const c = section.content;
  return (
    <SectionShell id="services">
      <SectionHeading
        align="left"
        label={section.label}
        headline={section.headline}
        subheadline={section.subheadline}
        action={c.cta ? <ButtonLink href={c.cta.url} className={roleClass(section.style, "button")} arrow>{c.cta.label}</ButtonLink> : undefined}
      />
      <SectionReveal animation={section.animation} className="mt-12 tablet:mt-16">
        <ServicesAccordion services={services} fallbackImage={c.image || null} openFirst={c.open_first !== false} />
      </SectionReveal>
    </SectionShell>
  );
}
