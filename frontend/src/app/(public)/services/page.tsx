import type { Metadata } from "next";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageHero } from "@/components/sections/page-sections";
import { SectionRenderer } from "@/components/sections/renderer";
import { SectionShell } from "@/components/sections/shell";
import { ServiceCard } from "@/features/services/service-card";
import { getPage, getProductTypes, getServices, getSite } from "@/lib/api";
import { bodySections, heroFor } from "@/lib/page-helpers";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getPage("services")]);
  return buildMetadata({ site, title: page?.meta_title || "Services", description: page?.meta_description, path: "/services" });
}

export default async function ServicesPage() {
  const [page, services, productTypes] = await Promise.all([getPage("services"), getServices(), getProductTypes()]);
  return (
    <>
      <PageHero section={heroFor(page, { label: "Services", headline: "Everything you need\nto ship your product." })} />

      <section className="container-q pb-16 tablet:pb-24" aria-label="Service groups">
        <div className="panel grid gap-4 p-3 tablet:grid-cols-2 tablet:p-4 desktop:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.06}><ServiceCard service={s} index={i} /></Reveal>
          ))}
        </div>
      </section>

      {productTypes.length > 0 && (
        <SectionShell>
          <SectionHeading label="Capabilities" headline={"Products we\ndesign and build."} subheadline="Each service can be applied to any of these product categories." />
          <ul className="mt-12 flex flex-wrap justify-center gap-3 tablet:mt-16">
            {productTypes.map((p, i) => (
              <Reveal as="li" key={p.slug} delay={i * 0.03} y={12}>
                <span className="inline-flex items-center gap-3 rounded-full bg-card py-2 pl-2 pr-5 text-[1rem] text-ink shadow-[var(--shadow-card)]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white"><Icon name={p.icon_key} className="h-4 w-4" /></span>
                  {p.name}
                </span>
              </Reveal>
            ))}
          </ul>
        </SectionShell>
      )}

      <SectionRenderer sections={bodySections(page)} />
    </>
  );
}
