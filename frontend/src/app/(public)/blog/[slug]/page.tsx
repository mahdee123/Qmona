import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetailView } from "@/features/blog/post-detail";
import { getPost, getRelatedPosts, getSite } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, post] = await Promise.all([getSite(), getPost(slug)]);
  if (!post) return { title: "Article not found" };
  return buildMetadata({
    site,
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    path: `/blog/${slug}`,
    image: post.og_image || post.cover_image,
    type: "article",
    publishedTime: post.published_at,
  });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const [post, related, site] = await Promise.all([getPost(slug), getRelatedPosts(slug), getSite()]);
  if (!post) notFound();
  return (
    <>
      <PostDetailView post={post} related={related} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${slug}` }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          url: absoluteUrl(`/blog/${slug}`),
          datePublished: post.published_at,
          dateModified: post.updated_at,
          publisher: { "@type": "Organization", name: site.profile.agency_name },
          ...(post.author ? { author: { "@type": "Person", name: post.author.name } } : {}),
          ...(post.cover_image ? { image: post.cover_image.url } : {}),
        }}
      />
    </>
  );
}
