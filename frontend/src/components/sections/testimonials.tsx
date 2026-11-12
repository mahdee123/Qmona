import Image from "next/image";
import type { Link, Section, Testimonial } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { getTestimonials } from "@/lib/api";
import { roleClass, type SectionStyle } from "@/lib/section-style";
import { SAMPLE_TESTIMONIALS, SampleChip } from "./sample-content";
import { CtaCard, SectionShell } from "./shell";

function QuoteMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="currentColor" aria-hidden="true">
      <path d="M4.6 18.6c-.9-1-1.4-2.1-1.4-3.9 0-3.1 2.2-5.9 5.4-7.3l.8 1.2c-3 1.6-3.6 3.7-3.8 5 .5-.3 1.1-.4 1.7-.3 1.6.1 2.9 1.5 2.9 3.2 0 1.8-1.4 3.2-3.2 3.2-1 0-2-.5-2.4-1.1Zm10 0c-.9-1-1.4-2.1-1.4-3.9 0-3.1 2.2-5.9 5.4-7.3l.8 1.2c-3 1.6-3.6 3.7-3.8 5 .5-.3 1.1-.4 1.7-.3 1.6.1 2.9 1.5 2.9 3.2 0 1.8-1.4 3.2-3.2 3.2-1 0-2-.5-2.4-1.1Z" />
    </svg>
  );
}

export function TestimonialCard({ t, style }: { t: Testimonial; style?: SectionStyle }) {
  return (
    <figure className={roleClass(style, "card", "flex h-full flex-col gap-5 rounded-[28px] bg-card p-6 shadow-[var(--shadow-card)] tablet:p-7")}>
      <QuoteMark />
      {t.metric_value && (
        <div className="space-y-2">
          <p className="text-[2.25rem] font-medium leading-none tracking-[-0.05em]">{t.metric_value}</p>
          {t.metric_label && <p className={roleClass(style, "card_title", "text-[1.375rem] font-medium tracking-[-0.03em]")}>{t.metric_label}</p>}
        </div>
      )}
      <blockquote className={roleClass(style, "card_text", "t-body")}>{t.content}</blockquote>
      <figcaption className="mt-auto flex items-center gap-4 pt-2">
        {t.avatar ? (
          <Image src={t.avatar.url} alt="" width={56} height={56} className="h-14 w-14 rounded-[16px] object-cover shadow-[var(--shadow-card)]" />
        ) : (
          <span aria-hidden="true" className="inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-page text-lg font-bold text-ink">
            {t.client_name.slice(0, 1)}
          </span>
        )}
        <span>
          <span className="block text-[1.0625rem] text-ink">{t.client_name}</span>
          <span className="block text-[0.875rem] text-muted">{[t.client_role, t.company_name].filter(Boolean).join(", ")}</span>
        </span>
      </figcaption>
    </figure>
  );
}

type TestimonialsContent = {
  limit?: number;
  cta?: Link;
  cta_title?: string;
  cta_text?: string;
  cta_button?: Link;
  show_sample_content?: boolean;
};

/** Real cards need verified + published testimonials; sample cards appear only while none exist and the flag is on. */
export async function TestimonialsSection({ section }: { section: Section<TestimonialsContent> }) {
  const c = section.content;
  const all = await getTestimonials();
  const sample = !all.length && !!c.show_sample_content;
  if (!all.length && !sample) return null;
  const items = (sample ? SAMPLE_TESTIMONIALS : all).slice(0, c.limit || 6);
  return (
    <SectionShell id="testimonials">
      <SectionHeading label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
      {sample && <SampleChip className="mt-6 text-center" />}
      <div className="mt-12 grid gap-4 tablet:mt-16 tablet:grid-cols-2 tablet:gap-6">
        {items.map((t, i) => (
          <Reveal key={t.id} delay={(i % 2) * 0.08}><TestimonialCard t={t} style={section.style} /></Reveal>
        ))}
      </div>
      {(c.cta_title || c.cta_button) && (
        <Reveal className="mt-6">
          <CtaCard tone="dark" title={c.cta_title} text={c.cta_text} cta={c.cta_button} className="min-h-[16rem]" style={section.style} />
        </Reveal>
      )}
      {c.cta && (
        <div className="mt-8 flex justify-end">
          <ButtonLink href={c.cta.url} className={roleClass(section.style, "button")} variant="secondary">{c.cta.label}</ButtonLink>
        </div>
      )}
    </SectionShell>
  );
}
