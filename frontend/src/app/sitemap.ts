import type { MetadataRoute } from "next";
import { getIndustries, getPosts, getProjects, getServices, getSite } from "@/lib/api";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = ["/", "/services", "/industries", "/work", "/about", "/contact", "/support"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: absoluteUrl(p),
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "/" ? 1 : 0.7,
  }));

  try {
    const [site, services, industries, projects, posts] = await Promise.all([
      getSite(),
      getServices(),
      getIndustries(),
      getProjects({ page_size: 100 }),
      getPosts({ page_size: 100 }),
    ]);
    if (site.availability.blog) entries.push({ url: absoluteUrl("/blog"), lastModified: now, priority: 0.6 });
    site.legal_pages.forEach((p) => entries.push({ url: absoluteUrl(`/${p.slug}`), lastModified: now, priority: 0.2 }));
    services.forEach((s) => entries.push({ url: absoluteUrl(`/services/${s.slug}`), lastModified: now, priority: 0.8 }));
    industries.forEach((i) => entries.push({ url: absoluteUrl(`/industries/${i.slug}`), lastModified: now, priority: 0.6 }));
    projects.results.forEach((p) =>
      entries.push({ url: absoluteUrl(`/work/${p.slug}`), lastModified: p.published_at ? new Date(p.published_at) : now, priority: 0.7 }),
    );
    posts.results.forEach((p) =>
      entries.push({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: new Date(p.published_at), priority: 0.5 }),
    );
  } catch {
    // Backend unreachable: return the static routes only.
  }
  return entries;
}
