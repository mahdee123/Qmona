import type { Link, Section } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SectionReveal } from "@/components/ui/motion";
import { Headline } from "@/components/ui/section-heading";
import { Ticker } from "@/components/ui/ticker";
import { getProductTypes } from "@/lib/api";
import { roleClass } from "@/lib/section-style";

type CtaContent = { primary_cta?: Link; secondary_cta?: Link; show_capability_ticker?: boolean };

export async function CtaBannerSection({ section }: { section: Section<CtaContent> }) {
  const c = section.content;
  const productTypes = c.show_capability_ticker ? await getProductTypes() : [];

  if (section.variant === "dark") {
    return (
      <section className="container-q py-10 tablet:py-14" aria-label="Call to action">
        <SectionReveal animation={section.animation}>
          <div className="relative flex min-h-[17rem] flex-col justify-between gap-10 overflow-hidden rounded-[32px] bg-ink-deep p-7 text-white tablet:p-10 desktop:flex-row desktop:items-end">
            <div aria-hidden="true" className="halftone absolute inset-0 text-accent/70" />
            <div className="relative max-w-xl space-y-4">
              <Headline text={section.headline} className={roleClass(section.style, "heading", "text-[2rem] font-bold leading-[1.05] tracking-[-0.045em] tablet:text-[2.5rem]")} />
              {section.subheadline && <p className={roleClass(section.style, "subheading", "text-[1.0625rem] text-white/70")}>{section.subheadline}</p>}
            </div>
            <div className="relative flex flex-wrap gap-4">
              {c.secondary_cta && <ButtonLink href={c.secondary_cta.url} className={roleClass(section.style, "button")} variant="light">{c.secondary_cta.label}</ButtonLink>}
              {c.primary_cta && <ButtonLink href={c.primary_cta.url} className={roleClass(section.style, "button")} arrow>{c.primary_cta.label}</ButtonLink>}
            </div>
          </div>
        </SectionReveal>
      </section>
    );
  }

  return (
    <section className="container-q py-10 tablet:py-14" aria-label="Call to action">
      <SectionReveal animation={section.animation}>
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-page to-panel px-5 py-16 text-center tablet:px-10 tablet:py-24">
          <div aria-hidden="true" className="halftone-center absolute inset-0 text-accent/25" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6">
            <Headline text={section.headline} className={roleClass(section.style, "heading", "t-h2")} />
            {section.subheadline && <p className={roleClass(section.style, "subheading", "t-lead max-w-xl")}>{section.subheadline}</p>}
            <div className="mt-4 flex w-full flex-col gap-4 tablet:w-auto tablet:flex-row tablet:gap-6">
              {c.primary_cta && <ButtonLink href={c.primary_cta.url} className={roleClass(section.style, "button")} size="lg" arrow>{c.primary_cta.label}</ButtonLink>}
              {c.secondary_cta && <ButtonLink href={c.secondary_cta.url} className={roleClass(section.style, "button")} size="lg" variant="secondary">{c.secondary_cta.label}</ButtonLink>}
            </div>
            {productTypes.length > 0 && (
              <div className="mt-10 w-full max-w-2xl">
                <Ticker
                  label="What we build"
                  speed={50}
                  items={productTypes.map((p) => (
                    <span key={p.slug} className="inline-flex items-center gap-2 text-[0.9375rem] font-bold tracking-[-0.02em] text-ink/45">
                      <Icon name={p.icon_key} className="h-4 w-4" />
                      {p.name}
                    </span>
                  ))}
                />
              </div>
            )}
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
