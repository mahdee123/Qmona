import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PageHero } from "@/components/sections/page-sections";
import { SectionRenderer } from "@/components/sections/renderer";
import { ClearFiltersButton, PendingResults, PortfolioFilters } from "@/features/projects/portfolio-filters";
import { ProjectCard } from "@/features/projects/project-card";
import { getIndustries, getPage, getProductTypes, getProjects, getServices, getSite } from "@/lib/api";
import { bodySections, firstParam, heroFor, listParam } from "@/lib/page-helpers";
import { buildMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [site, page, sp] = await Promise.all([getSite(), getPage("work"), searchParams]);
  const filtered = Object.keys(sp).length > 0;
  return buildMetadata({ site, title: page?.meta_title || "Work", description: page?.meta_description, path: "/work", noindex: filtered });
}

export default async function WorkPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = {
    services: listParam(sp.services),
    industries: listParam(sp.industries),
    product_types: listParam(sp.product_types),
    search: (firstParam(sp.search) || "").slice(0, 100),
    page: Math.max(1, Number(firstParam(sp.page)) || 1),
    page_size: 12,
  };
  const [page, services, industries, productTypes] = await Promise.all([getPage("work"), getServices(), getIndustries(), getProductTypes()]);

  let projects: Awaited<ReturnType<typeof getProjects>> | null = null;
  let failed = false;
  try {
    projects = await getProjects(query);
  } catch {
    failed = true;
  }
  const hasFilters = query.services.length + query.industries.length + query.product_types.length > 0 || !!query.search;

  return (
    <>
      <PageHero section={heroFor(page, { label: "Work", headline: "Bold ideas,\nshipped with care." })} />
      <section className="container-q pb-16 tablet:pb-24" aria-label="Projects">
        <PortfolioFilters
          total={projects?.count ?? 0}
          groups={[
            { key: "services", label: "Services", options: services.map((s) => ({ slug: s.slug, name: s.title })) },
            { key: "industries", label: "Industries", options: industries.map((i) => ({ slug: i.slug, name: i.name })) },
            { key: "product_types", label: "Product types", options: productTypes.map((p) => ({ slug: p.slug, name: p.name })) },
          ]}
        >
          <PendingResults>
            {failed ? (
              <ErrorState description="Projects could not be loaded right now. Please refresh the page in a moment." />
            ) : projects && projects.results.length > 0 ? (
              <>
                <div className="grid gap-x-6 gap-y-12 tablet:grid-cols-2">
                  {projects.results.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 2) * 0.06} y={20}>
                      <ProjectCard project={p} priority={i < 2} />
                    </Reveal>
                  ))}
                </div>
                <Pagination
                  page={projects.page}
                  totalPages={projects.total_pages}
                  basePath="/work"
                  params={{
                    services: query.services.join(",") || undefined,
                    industries: query.industries.join(",") || undefined,
                    product_types: query.product_types.join(",") || undefined,
                    search: query.search || undefined,
                  }}
                />
              </>
            ) : hasFilters ? (
              <EmptyState title="No projects match these filters" description="Try removing a filter or searching for something else." action={<ClearFiltersButton />} />
            ) : (
              <EmptyState
                title="Case studies are on the way"
                description="We are preparing detailed write-ups of recent work. In the meantime, tell us about your project."
                action={<ButtonLink href="/contact" arrow>Start a Project</ButtonLink>}
              />
            )}
          </PendingResults>
        </PortfolioFilters>
      </section>
      <SectionRenderer sections={bodySections(page)} />
    </>
  );
}
