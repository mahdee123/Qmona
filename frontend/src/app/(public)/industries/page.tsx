import type { Metadata } from "next";
import { Reveal } from "@/components/ui/motion";
import { EmptyState } from "@/components/ui/states";
import { PageHero } from "@/components/sections/page-sections";
import { SectionRenderer } from "@/components/sections/renderer";
import { IndustryCard } from "@/features/services/service-card";
import { getIndustries, getPage, getSite } from "@/lib/api";
import { bodySections, heroFor } from "@/lib/page-helpers";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getPage("industries")]);
  return buildMetadata({ site, title: page?.meta_title || "Industries", description: page?.meta_description, path: "/industries" });
}

export default async function IndustriesPage() {
  const [page, industries] = await Promise.all([getPage("industries"), getIndustries()]);
  return (
    <>
      <PageHero section={heroFor(page, { label: "Industries", headline: "Built for the way\nyour industry works." })} />
      <section className="container-q pb-16 tablet:pb-24" aria-label="Industries">
        {industries.length ? (
          <div className="panel grid gap-4 p-3 tablet:grid-cols-2 tablet:p-4 desktop:grid-cols-3">
            {industries.map((ind, i) => (
              <Reveal key={ind.id} delay={(i % 3) * 0.06}><IndustryCard industry={ind} /></Reveal>
            ))}
          </div>
        ) : (
          <EmptyState title="Industries coming soon" description="We are preparing this list." />
        )}
      </section>
      <SectionRenderer sections={bodySections(page)} />
    </>
  );
}
