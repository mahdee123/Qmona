import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { PageHero } from "@/components/sections/page-sections";
import { PostCardFeatured, PostCardRow } from "@/features/blog/post-card";
import { getBlogCategories, getPage, getPosts, getSite } from "@/lib/api";
import { firstParam, heroFor } from "@/lib/page-helpers";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [site, page, sp] = await Promise.all([getSite(), getPage("blog"), searchParams]);
  return buildMetadata({ site, title: page?.meta_title || "Blog", description: page?.meta_description, path: "/blog", noindex: Object.keys(sp).length > 0 });
}

export default async function BlogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const category = firstParam(sp.category) || "";
  const pageNum = Math.max(1, Number(firstParam(sp.page)) || 1);
  const [page, posts, categories] = await Promise.all([
    getPage("blog"),
    getPosts({ page: pageNum, category: category || undefined, page_size: 9 }),
    getBlogCategories(),
  ]);
  const [first, ...rest] = posts.results;
  const showFeatured = pageNum === 1 && first;

  return (
    <>
      <PageHero section={heroFor(page, { label: "Blog", headline: "Insights & ideas,\nfrom the team." })} />
      <section className="container-q pb-16 tablet:pb-24" aria-label="Articles">
        {categories.length > 0 && (
          <nav aria-label="Categories" className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4">
            {[{ slug: "", name: "All" }, ...categories].map((c) => {
              const active = c.slug === category;
              return (
                <Link
                  key={c.slug || "all"}
                  href={c.slug ? `/blog?category=${c.slug}` : "/blog"}
                  aria-current={active ? "page" : undefined}
                  className={cn("shrink-0 rounded-full px-5 py-2.5 text-[0.9375rem]", active ? "bg-card text-ink shadow-[var(--shadow-button)]" : "text-body hover:text-ink")}
                >
                  {c.name}
                </Link>
              );
            })}
          </nav>
        )}
        {!first ? (
          <EmptyState
            title="No articles yet"
            description="We have not published any articles here yet. Check back soon."
            action={<ButtonLink href="/contact" variant="secondary">Get in touch</ButtonLink>}
          />
        ) : (
          <>
            <div className="grid gap-10 desktop:grid-cols-2 desktop:gap-6">
              {showFeatured ? (
                <>
                  <Reveal><PostCardFeatured post={first} /></Reveal>
                  <div className="flex flex-col gap-8">
                    {rest.slice(0, 2).map((p, i) => <Reveal key={p.id} delay={0.08 * (i + 1)}><PostCardRow post={p} /></Reveal>)}
                  </div>
                </>
              ) : null}
            </div>
            <div className="mt-12 grid gap-10 desktop:grid-cols-2 desktop:gap-6">
              {(showFeatured ? rest.slice(2) : posts.results).map((p, i) => (
                <Reveal key={p.id} delay={(i % 2) * 0.06}><PostCardRow post={p} /></Reveal>
              ))}
            </div>
            <Pagination page={posts.page} totalPages={posts.total_pages} basePath="/blog" params={{ category: category || undefined }} />
          </>
        )}
      </section>
    </>
  );
}
