import type { FAQItem, Link, Section } from "@/types";
import { Accordion } from "@/components/ui/accordion";
import { SectionReveal } from "@/components/ui/motion";
import { Paragraphs } from "@/components/ui/rich-text";
import { SectionHeading } from "@/components/ui/section-heading";
import { getFaqs } from "@/lib/api";
import { JsonLd } from "@/lib/seo";
import { CtaCard, SectionShell } from "./shell";
import type { SectionStyle } from "@/lib/section-style";

type FaqContent = { side_title?: string; side_text?: string; cta?: Link; limit?: number };

export function FaqBlock({ faqs, content, style }: { faqs: FAQItem[]; content: FaqContent; style?: SectionStyle }) {
  return (
    <div className="panel grid gap-4 p-3 tablet:p-4 desktop:grid-cols-[0.8fr_1.2fr]">
      <div className="order-2 flex flex-col justify-end desktop:order-1">
        <CtaCard title={content.side_title} text={content.side_text} cta={content.cta} style={style} />
      </div>
      <Accordion
        className="order-1 desktop:order-2"
        defaultOpen={faqs[0]?.id}
        items={faqs.map((f) => ({ id: f.id, title: f.question, content: <Paragraphs text={f.answer} /> }))}
      />
    </div>
  );
}

export function faqJsonLd(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

export async function FaqSection({ section }: { section: Section<FaqContent> }) {
  const faqs = (await getFaqs({ home: true })).slice(0, section.content.limit || 12);
  if (!faqs.length) return null;
  return (
    <SectionShell id="faq">
      <SectionHeading align="left" label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
      <SectionReveal animation={section.animation} className="mt-12 tablet:mt-16">
        <FaqBlock faqs={faqs} content={section.content} style={section.style} />
      </SectionReveal>
      <JsonLd data={faqJsonLd(faqs)} />
    </SectionShell>
  );
}
