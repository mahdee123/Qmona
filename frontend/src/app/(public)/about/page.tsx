import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage, getSite } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getPage("about")]);
  return buildMetadata({ site, title: page?.meta_title || "About", description: page?.meta_description, path: "/about", image: page?.og_image });
}

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) notFound();
  return <SectionRenderer sections={page.sections} />;
}
