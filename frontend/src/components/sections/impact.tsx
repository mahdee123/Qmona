import Image from "next/image";
import type { CredibilityItem, Link, ProductType, Section } from "@/types";
import { CountUp } from "@/components/ui/count-up";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/motion";
import { IconPill } from "@/components/ui/pill";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCredibility, getProductTypes } from "@/lib/api";
import { roleClass, type SectionStyle } from "@/lib/section-style";
import { cn } from "@/lib/utils";
import { CtaCard, SectionShell } from "./shell";

type ImpactContent = { cta_title?: string; cta_text?: string; cta?: Link; max_items?: number };

function StatCard({ item, wide, delay, style }: { item: CredibilityItem; wide?: boolean; delay: number; style?: SectionStyle }) {
  return (
    <Reveal delay={delay} className={cn("flex", wide && "desktop:col-span-3")}>
      <article
        className={cn(
          roleClass(style, "card", "flex w-full flex-col justify-between gap-10 rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)] tablet:p-7"),
          wide && "desktop:flex-row desktop:items-center desktop:justify-start desktop:gap-12",
        )}
      >
        <IconPill icon={item.icon_key} />
        <div className={cn("space-y-2", wide && "desktop:flex desktop:flex-1 desktop:items-center desktop:gap-10 desktop:space-y-0")}>
          {item.value && (
            <p className="text-[2.5rem] font-medium leading-none tracking-[-0.05em] tablet:text-[3rem]">
              <CountUp value={item.value} />
            </p>
          )}
          <h3 className={roleClass(style, "card_title", "text-[1.375rem] font-medium tracking-[-0.035em]")}>{item.title}</h3>
          {item.description && <p className={roleClass(style, "card_text", "t-small max-w-sm")}>{item.description}</p>}
        </div>
      </article>
    </Reveal>
  );
}

function AwardsCard({ awards, delay, style }: { awards: CredibilityItem[]; delay: number; style?: SectionStyle }) {
  return (
    <Reveal delay={delay} className="desktop:col-span-2">
      <article className={roleClass(style, "card", "flex h-full flex-col gap-8 rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)] tablet:p-7")}>
        <IconPill icon="trophy" />
        <ul className="grid gap-3 tablet:grid-cols-2">
          {awards.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-full bg-page py-2 pl-2 pr-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-warning"><Icon name="award" className="h-4 w-4" /></span>
              <span>
                <span className="block text-[0.9375rem] text-ink">{a.title}</span>
                {a.value && <span className="block text-[0.75rem] text-muted">{a.description || a.value}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-1">
          <p className="text-[2.5rem] font-medium leading-none tracking-[-0.05em]">{awards.length}</p>
          <h3 className={roleClass(style, "card_title", "text-[1.375rem] font-medium tracking-[-0.035em]")}>Recognition</h3>
        </div>
      </article>
    </Reveal>
  );
}

/** Stands in for the reference's awards card when there are no verified awards: lists what Qmona builds (factual). */
function BuildsCard({ types, delay, style }: { types: ProductType[]; delay: number; style?: SectionStyle }) {
  return (
    <Reveal delay={delay} className="desktop:col-span-2">
      <article className={roleClass(style, "card", "flex h-full flex-col gap-8 rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)] tablet:p-7")}>
        <IconPill icon="layers" />
        <ul className="grid gap-3 tablet:grid-cols-2">
          {types.map((t) => (
            <li key={t.slug} className="flex items-center gap-3 rounded-full bg-page py-2 pl-2 pr-5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-ink"><Icon name={t.icon_key} className="h-4 w-4" /></span>
              <span className="text-[0.9375rem] text-ink">{t.name}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-1">
          <h3 className={roleClass(style, "card_title", "text-[1.375rem] font-medium tracking-[-0.035em]")}>What we build</h3>
        </div>
      </article>
    </Reveal>
  );
}

export async function ImpactSection({ section }: { section: Section<ImpactContent> }) {
  const [items, productTypes] = await Promise.all([getCredibility(), getProductTypes()]);
  const c = section.content;
  const stats = items.filter((i) => i.kind === "capability" || i.kind === "stat").slice(0, c.max_items || 6);
  const awards = items.filter((i) => i.kind === "award");
  const logos = items.filter((i) => i.kind === "client_logo" && i.logo);
  if (!stats.length && !awards.length && !c.cta_title) return null;

  const first = stats.slice(0, 2);
  const rest = stats.slice(2);
  // Reference row 2 = one stat card + a wide list card (awards, or what we build while there are none).
  const builds = !awards.length && rest.length >= 1 ? productTypes.slice(0, 6) : [];
  const loneLast = rest.length % 3 === 1 && !awards.length && !builds.length;

  return (
    <SectionShell id="impact">
      <SectionHeading label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
      <div className="panel mt-12 grid gap-4 p-3 tablet:mt-16 tablet:grid-cols-2 tablet:p-4 desktop:grid-cols-3">
        {first.map((item, i) => <StatCard key={item.id} item={item} delay={i * 0.08} style={section.style} />)}
        <Reveal delay={0.16} className="tablet:col-span-2 desktop:col-span-1">
          <CtaCard title={c.cta_title} text={c.cta_text} cta={c.cta} className="h-full" style={section.style} />
        </Reveal>
        {rest.map((item, i) => (
          <StatCard key={item.id} item={item} delay={0.1 + i * 0.08} wide={loneLast && i === rest.length - 1} style={section.style} />
        ))}
        {awards.length > 0 && <AwardsCard awards={awards} delay={0.2} style={section.style} />}
        {builds.length > 0 && <BuildsCard types={builds} delay={0.2} style={section.style} />}
      </div>
      {logos.length > 0 && (
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-70" aria-label="Clients">
          {logos.map((l) => (
            <li key={l.id}>
              <Image src={l.logo!.url} alt={l.title} width={l.logo!.width || 120} height={l.logo!.height || 40} className="h-8 w-auto grayscale" unoptimized={l.logo!.mime_type === "image/svg+xml"} />
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
