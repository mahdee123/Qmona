import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/features/projects/project-detail";
import { getProject, getRelatedProjects, getSite } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, project] = await Promise.all([getSite(), getProject(slug)]);
  if (!project) return { title: "Project not found" };
  return buildMetadata({
    site,
    title: project.meta_title || project.title,
    description: project.meta_description || project.summary,
    path: `/work/${slug}`,
    image: project.cover_image || project.thumbnail,
    type: "article",
    publishedTime: project.published_at,
  });
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [project, related, site] = await Promise.all([getProject(slug), getRelatedProjects(slug), getSite()]);
  if (!project) notFound();
  return (
    <>
      <ProjectDetailView project={project} related={related} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Work", path: "/work" }, { name: project.title, path: `/work/${slug}` }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          description: project.summary,
          url: absoluteUrl(`/work/${slug}`),
          creator: { "@type": "Organization", name: site.profile.agency_name },
          ...(project.published_at ? { datePublished: project.published_at } : {}),
          ...(project.cover_image ? { image: project.cover_image.url } : {}),
          ...(project.technologies.length ? { keywords: project.technologies.map((t) => t.name).join(", ") } : {}),
        }}
      />
    </>
  );
}
