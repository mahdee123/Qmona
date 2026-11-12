import Image from "next/image";
import { Check } from "lucide-react";
import type { Link, Media, Section } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal, SectionReveal } from "@/components/ui/motion";
import { IconPill } from "@/components/ui/pill";
import { Paragraphs } from "@/components/ui/rich-text";
import { Headline, SectionHeading, SectionLabel } from "@/components/ui/section-heading";
import { IndustryCard } from "@/features/services/service-card";
import { getIndustries, getTeam } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CtaCard, SectionShell } from "./shell";
import { roleClass } from "@/lib/section-style";

/** Inner-page hero (reference: centered H1 + sub, optional framed image grid). */
export function PageHero({
  section,
  children,
}: {
  section: Pick<Section<{ images?: Media[]; primary_cta?: Link; secondary_cta?: Link }>, "label" | "headline" | "subheadline" | "content" | "variant" | "animation" | "style">;
  children?: React.ReactNode;
}) {
  const images = section.content?.images || [];
  const centered = section.variant !== "default";
  const c = section.content || {};
  return (
    <section className="container-q pb-10 pt-12 tablet:pb-14 tablet:pt-20 desktop:pt-24">
      <Reveal immediate y={20} preset={section.animation?.enabled === false ? "none" : "fade_up"} className={cn("flex flex-col gap-5", centered ? "items-center text-center" : "items-start")}>
        {section.label && <SectionLabel>{section.label}</SectionLabel>}
        <Headline as="h1" text={section.headline} className={roleClass(section.style, "heading", "t-h1 max-w-[20ch]")} />
        {section.subheadline && <p className={roleClass(section.style, "subheading", cn("t-lead max-w-[36rem]", centered && "mx-auto"))}>{section.subheadline}</p>}
        {(c.primary_cta || c.secondary_cta) && (
          <div className="mt-4 flex flex-wrap gap-4">
            {c.primary_cta && <ButtonLink href={c.primary_cta.url} className={roleClass(section.style, "button")} arrow>{c.primary_cta.label}</ButtonLink>}
            {c.secondary_cta && <ButtonLink href={c.secondary_cta.url} className={roleClass(section.style, "button")} variant="secondary">{c.secondary_cta.label}</ButtonLink>}
          </div>
        )}
        {children}
      </Reveal>
      {images.length > 0 && (
        <Reveal delay={0.15} className="mt-12 grid gap-4 tablet:mt-16 tablet:grid-cols-2">
          {images.map((img, i) => (
            <div key={img.id} className={cn("frame", i === 0 && "tablet:col-span-2")}>
              <MediaImage media={img} aspect={i === 0 ? "aspect-[16/9]" : "aspect-[4/3]"} priority={i === 0} sizes={i === 0 ? "100vw" : "50vw"} />
            </div>
          ))}
        </Reveal>
      )}
    </section>
  );
}

export function StorySection({ section }: { section: Section<{ body?: string; points?: string[]; cta?: Link; image?: Media }> }) {
  const c = section.content;
  return (
    <SectionShell>
      <div className="grid gap-10 desktop:grid-cols-2 desktop:gap-16">
        <SectionHeading align="left" label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
        <SectionReveal animation={section.animation} className="space-y-8">
          {c.body && <Paragraphs text={c.body} className="t-lead text-ink/80" />}
          {c.points && c.points.length > 0 && (
            <ul className="space-y-3">
              {c.points.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-[18px] bg-card px-4 py-3 shadow-[var(--shadow-card)]">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-[1.0625rem] text-ink">{p}</span>
                </li>
              ))}
            </ul>
          )}
          {c.image && <div className="frame"><MediaImage media={c.image} aspect="aspect-[4/3]" /></div>}
          {c.cta && <ButtonLink href={c.cta.url} className={roleClass(section.style, "button")} variant="secondary">{c.cta.label}</ButtonLink>}
        </SectionReveal>
      </div>
    </SectionShell>
  );
}

export function ValuesSection({ section }: { section: Section<{ items?: { title: string; text: string; icon?: string }[] }> }) {
  const items = section.content.items || [];
  if (!items.length) return null;
  return (
    <SectionShell>
      <SectionHeading label={section.label} headline={section.headline} subheadline={section.subheadline} align={section.variant === "centered" ? "center" : "left"} style={section.style} />
      <div className="panel mt-12 grid gap-4 p-3 tablet:mt-16 tablet:grid-cols-2 tablet:p-4 desktop:grid-cols-4">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.06}>
            <article className={roleClass(section.style, "card", "flex h-full flex-col gap-8 rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)]")}>
              <IconPill icon={item.icon} />
              <div className="space-y-2">
                <h3 className={roleClass(section.style, "card_title", "text-[1.375rem] font-medium tracking-[-0.035em]")}>{item.title}</h3>
                <p className={roleClass(section.style, "card_text", "t-small")}>{item.text}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/** Hidden until team members are explicitly published. */
export async function TeamSection({ section }: { section: Section<{ hiring_title?: string; hiring_text?: string; hiring_cta?: Link }> }) {
  const team = await getTeam();
  if (!team.length) return null;
  const c = section.content;
  return (
    <SectionShell>
      <SectionHeading label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
      <div className="mt-12 grid gap-4 tablet:mt-16 tablet:grid-cols-2 desktop:grid-cols-3">
        {team.map((m, i) => (
          <Reveal key={m.id} delay={(i % 3) * 0.06}>
            <article className={roleClass(section.style, "card", "rounded-[28px] bg-card p-2 pb-5 shadow-[var(--shadow-card)]")}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-panel">
                {m.avatar ? (
                  <Image src={m.avatar.url} alt={m.avatar.alt_text || m.full_name} fill sizes="(min-width:1200px) 440px, 50vw" className="object-cover" />
                ) : (
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-ink/15">{m.full_name.slice(0, 1)}</span>
                )}
              </div>
              <div className="px-4 pt-4">
                <h3 className={roleClass(section.style, "card_title", "text-[1.25rem] font-medium tracking-[-0.03em]")}>{m.full_name}</h3>
                <p className={roleClass(section.style, "card_text", "t-small")}>{m.role_title}</p>
              </div>
            </article>
          </Reveal>
        ))}
        {c.hiring_title && (
          <Reveal><CtaCard title={c.hiring_title} text={c.hiring_text} cta={c.hiring_cta} className="h-full" style={section.style} /></Reveal>
        )}
      </div>
    </SectionShell>
  );
}

export async function IndustriesSection({ section }: { section: Section<{ cta?: Link; limit?: number }> }) {
  const industries = (await getIndustries()).slice(0, section.content.limit || 24);
  if (!industries.length) return null;
  return (
    <SectionShell>
      <SectionHeading
        align={section.variant === "centered" ? "center" : "left"}
        label={section.label}
        headline={section.headline}
        subheadline={section.subheadline}
        action={section.content.cta ? <ButtonLink href={section.content.cta.url} className={roleClass(section.style, "button")} variant="secondary">{section.content.cta.label}</ButtonLink> : undefined}
      />
      <div className="mt-12 grid gap-4 tablet:mt-16 tablet:grid-cols-2 desktop:grid-cols-3">
        {industries.map((ind, i) => (
          <Reveal key={ind.id} delay={(i % 3) * 0.06}><IndustryCard industry={ind} /></Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

export function RichTextSection({ section }: { section: Section<{ body?: string; cta?: Link }> }) {
  return (
    <SectionShell>
      <div className={cn("flex flex-col gap-8", section.variant === "centered" && "items-center text-center")}>
        <SectionHeading align={section.variant === "centered" ? "center" : "left"} label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
        {section.content.body && (
          <SectionReveal animation={section.animation} className="max-w-3xl">
            <Paragraphs text={section.content.body} className="t-lead text-ink/80" />
          </SectionReveal>
        )}
        {section.content.cta && <ButtonLink href={section.content.cta.url} className={roleClass(section.style, "button")} arrow>{section.content.cta.label}</ButtonLink>}
      </div>
    </SectionShell>
  );
}
