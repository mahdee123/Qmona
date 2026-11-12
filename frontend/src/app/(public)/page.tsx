import type { Metadata } from "next";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage, getSite } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getPage("home")]);
  return {
    ...buildMetadata({ site, description: page?.meta_description, path: "/", image: page?.og_image }),
    title: { absolute: page?.meta_title || site.profile.default_meta_title || site.profile.agency_name },
  };
}

export default async function HomePage() {
  const page = await getPage("home");
  if (!page) {
    return (
      <div className="container-q py-32 text-center">
        <h1 className="t-h1">Qmona Agency</h1>
        <p className="t-lead mt-4">The homepage has not been configured yet. Run the content seed or add sections in the admin portal.</p>
      </div>
    );
  }
  return <SectionRenderer sections={page.sections} />;
}
