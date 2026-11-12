import type { Metadata } from "next";
import { Reveal } from "@/components/ui/motion";
import { ContactDetails } from "@/components/sections/contact";
import { PageHero } from "@/components/sections/page-sections";
import { CtaCard } from "@/components/sections/shell";
import { SupportForm } from "@/features/inquiries/support-form";
import { getFormOptions, getPage, getSite } from "@/lib/api";
import { heroFor } from "@/lib/page-helpers";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getPage("support")]);
  return buildMetadata({ site, title: page?.meta_title || "Support", description: page?.meta_description, path: "/support" });
}

export default async function SupportPage() {
  const [site, options, page] = await Promise.all([getSite(), getFormOptions(), getPage("support")]);
  const profile = { ...site.profile, email: site.profile.support_email || site.profile.email };
  return (
    <>
      <PageHero section={heroFor(page, { label: "Support", headline: "How can we help?", subheadline: "Existing clients can report an issue or request a change here. No account needed." })} />
      <section className="container-q pb-20 tablet:pb-28" aria-label="Support form">
        <div className="grid gap-6 desktop:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="flex flex-col gap-6 desktop:sticky desktop:top-28 desktop:self-start">
            <ContactDetails profile={profile} />
            <CtaCard title="Starting something new?" text="For new projects, use the project inquiry form instead." cta={{ label: "Start a Project", url: "/contact" }} />
          </Reveal>
          <Reveal delay={0.1}>
            <SupportForm options={options} privacyNotice={site.profile.privacy_notice} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
