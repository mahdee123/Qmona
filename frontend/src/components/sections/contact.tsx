import type { Section, SiteProfile } from "@/types";
import { SectionReveal } from "@/components/ui/motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { ContactForm } from "@/features/inquiries/contact-form";
import { getFormOptions, getSite } from "@/lib/api";
import { SectionShell } from "./shell";

export function ContactDetails({ profile }: { profile: SiteProfile }) {
  const rows = [
    profile.email && { label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    profile.phone && { label: "Phone", value: profile.phone, href: `tel:${profile.phone.replace(/\s+/g, "")}` },
    profile.whatsapp && { label: "WhatsApp", value: profile.whatsapp, href: `https://wa.me/${profile.whatsapp.replace(/[^\d]/g, "")}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[];
  return (
    <div className="space-y-6 rounded-[28px] bg-panel p-6 tablet:p-7">
      {rows.map((r) => (
        <div key={r.label} className="space-y-1">
          <p className="text-[1.0625rem] text-body">{r.label}:</p>
          <a href={r.href} className="text-[1.1875rem] font-medium text-accent underline-offset-4 hover:underline" {...(r.href.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {r.value}
          </a>
        </div>
      ))}
      {profile.address && (
        <div className="space-y-1">
          <p className="text-[1.0625rem] text-body">Address:</p>
          <address className="text-[1.0625rem] not-italic text-ink">{profile.address}</address>
          {(profile.office_hours || profile.timezone_label) && (
            <p className="text-[0.8125rem] text-muted">{[profile.office_hours, profile.timezone_label].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  );
}

export async function ContactSection({ section }: { section: Section<{ form_title?: string; show_form?: boolean }> }) {
  const [site, options] = await Promise.all([getSite(), getFormOptions()]);
  return (
    <SectionShell id="contact">
      <div className="grid gap-10 desktop:grid-cols-2 desktop:gap-6">
        <div className="flex flex-col justify-between gap-10">
          <SectionHeading align="left" label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
          <SectionReveal animation={section.animation}>
            <ContactDetails profile={site.profile} />
          </SectionReveal>
        </div>
        {section.content.show_form !== false && (
          <SectionReveal animation={section.animation}>
            <ContactForm options={options} privacyNotice={site.profile.privacy_notice} source="/#contact" />
          </SectionReveal>
        )}
      </div>
    </SectionShell>
  );
}
