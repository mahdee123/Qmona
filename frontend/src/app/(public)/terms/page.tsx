import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalView } from "@/features/cms/legal-view";
import { getLegalPage, getSite } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getLegalPage("terms")]);
  return buildMetadata({ site, title: page?.meta_title || page?.title || "Terms of Service", description: page?.meta_description || page?.summary, path: "/terms" });
}

/** Content managed in Admin → Legal pages; 404 until published. */
export default async function Page() {
  const page = await getLegalPage("terms");
  if (!page) notFound();
  return <LegalView page={page} />;
}
