import Image from "next/image";
import NextLink from "next/link";
import type { Link, Section } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { Headline } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Ticker } from "@/components/ui/ticker";
import { getCredibility, getProductTypes, getProjects, getSite, getTestimonials } from "@/lib/api";
import { roleClass } from "@/lib/section-style";

type HeroContent = {
  primary_cta?: Link;
  secondary_cta?: Link;
  ticker_label?: string;
  show_capability_ticker?: boolean;
  show_side_cards?: boolean;
  show_trusted_by?: boolean;
  trusted_by_label?: string;
  show_project_card?: boolean;
};

export async function HeroSection({ section }: { section: Section<HeroContent> }) {
  const c = section.content;
  // Trusted-by logos and the project card are data-driven: they only render when verified items are published.
  const [site, productTypes, testimonials, credibility, featured] = await Promise.all([
    getSite(),
    c.show_capability_ticker ? getProductTypes() : Promise.resolve([]),
    c.show_side_cards ? getTestimonials() : Promise.resolve([]),
    c.show_trusted_by !== false ? getCredibility() : Promise.resolve([]),
    c.show_project_card !== false ? getProjects({ featured: true, page_size: 1 }) : Promise.resolve(null),
  ]);
  const anim = section.animation;
  const animated = anim.enabled;
  const sideCards = testimonials.slice(0, 4);
  const logos = credibility.filter((i) => i.kind === "client_logo" && i.logo).slice(0, 6);
  const project = featured?.results[0];

  return (
    <section className="relative isolate -mt-[84px] overflow-hidden pt-[84px]" aria-label="Introduction">
      {/* Soft accent glow arc (reference hero background) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[44rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_28%,transparent),transparent)] blur-2xl" />
        <div className="absolute left-1/2 top-[-6rem] h-[36rem] w-[36rem] -translate-x-[10%] rotate-[28deg] rounded-full border-[48px] border-white/60 blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-page" />
      </div>

      {sideCards.length >= 2 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 hidden desktop:block">
          {sideCards.map((t, i) => (
            <div
              key={t.id}
              className={[
                "absolute w-56 rounded-[18px] bg-card/90 p-4 text-[0.8125rem] leading-snug text-body shadow-[var(--shadow-card)] backdrop-blur",
                i % 2 === 0 ? "left-6" : "right-6",
                i < 2 ? "top-12" : "top-56",
                i === 0 ? "-rotate-3" : i === 1 ? "rotate-2" : i === 2 ? "rotate-2 opacity-70" : "-rotate-2 opacity-70",
              ].join(" ")}
            >
              “{t.content.slice(0, 90)}{t.content.length > 90 ? "…" : ""}”
              <p className="mt-2 text-ink">– {t.client_name}</p>
            </div>
          ))}
        </div>
      )}

      {project && (
        <NextLink
          href={`/work/${project.slug}`}
          className="absolute bottom-24 right-6 hidden w-64 rotate-2 rounded-[18px] bg-card/95 p-4 shadow-[var(--shadow-card)] backdrop-blur transition-transform hover:rotate-0 desktop:block"
        >
          {project.thumbnail && (
            <Image
              src={project.thumbnail.url}
              alt=""
              width={project.thumbnail.width || 480}
              height={project.thumbnail.height || 300}
              className="mb-3 h-28 w-full rounded-[12px] object-cover"
              unoptimized={project.thumbnail.mime_type === "image/svg+xml"}
            />
          )}
          <p className="text-[0.9375rem] font-medium tracking-[-0.02em] text-ink">{project.title}</p>
          {project.tagline && <p className="mt-1 text-[0.8125rem] leading-snug text-body">{project.tagline}</p>}
          <span className="mt-3 inline-block text-[0.8125rem] text-accent">View Project →</span>
        </NextLink>
      )}

      <div className="container-q flex flex-col items-center px-4 pb-16 pt-16 text-center tablet:pb-20 tablet:pt-24 desktop:pt-28">
        {site.profile.availability_label && (
          <Reveal immediate spring={animated} preset={animated ? "fade_up" : "none"} delay={0.05} y={16}>
            <p className="inline-flex items-center gap-2.5 rounded-full bg-card px-4 py-2 text-[0.875rem] text-ink shadow-[var(--shadow-button)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {site.profile.availability_label}
            </p>
          </Reveal>
        )}

        <Reveal immediate spring={animated} preset={animated ? anim.preset : "none"} delay={0.15 + anim.delay} y={24} className="mt-7">
          <Headline as="h1" text={section.headline} className={roleClass(section.style, "heading", "t-display mx-auto max-w-[16ch]")} />
        </Reveal>

        {section.subheadline && (
          <Reveal immediate spring={animated} preset={animated ? anim.preset : "none"} delay={0.3 + anim.delay} y={24}>
            <p className={roleClass(section.style, "subheading", "t-lead mx-auto mt-6 max-w-[36rem]")}>{section.subheadline}</p>
          </Reveal>
        )}

        {(c.primary_cta || c.secondary_cta) && (
          <Reveal
            immediate
            spring={animated}
            preset={animated ? anim.preset : "none"}
            delay={0.45 + anim.delay}
            y={24}
            className="mt-10 flex w-full flex-col items-stretch gap-4 tablet:w-auto tablet:flex-row tablet:items-center tablet:justify-center tablet:gap-6"
          >
            {c.primary_cta && <ButtonLink href={c.primary_cta.url} className={roleClass(section.style, "button")} size="lg" arrow>{c.primary_cta.label}</ButtonLink>}
            {c.secondary_cta && <ButtonLink href={c.secondary_cta.url} className={roleClass(section.style, "button")} size="lg" variant="secondary">{c.secondary_cta.label}</ButtonLink>}
          </Reveal>
        )}

        {logos.length > 0 && (
          <Reveal immediate spring={animated} preset={animated ? "fade" : "none"} delay={0.6 + anim.delay} className="mt-16 w-full tablet:mt-20">
            <p className="mb-5 text-[0.8125rem] uppercase tracking-[0.04em] text-body">{c.trusted_by_label || "Trusted by"}</p>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 opacity-70" aria-label="Clients">
              {logos.map((l) => (
                <li key={l.id}>
                  <Image
                    src={l.logo!.url}
                    alt={l.title}
                    width={l.logo!.width || 120}
                    height={l.logo!.height || 40}
                    className="h-7 w-auto grayscale"
                    unoptimized={l.logo!.mime_type === "image/svg+xml"}
                  />
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {c.show_capability_ticker && productTypes.length > 0 && (
          <Reveal immediate spring={animated} preset={animated ? "fade" : "none"} delay={0.65 + anim.delay} className="mt-16 w-full max-w-3xl tablet:mt-24">
            {c.ticker_label && <p className="mb-4 text-[0.8125rem] uppercase tracking-[0.04em] text-body">{c.ticker_label}</p>}
            <Ticker
              label={c.ticker_label || "What we build"}
              speed={45}
              items={productTypes.map((p) => (
                <span key={p.slug} className="inline-flex items-center gap-2 text-[1.0625rem] font-bold tracking-[-0.02em] text-ink/55">
                  <Icon name={p.icon_key} className="h-5 w-5" />
                  {p.name}
                </span>
              ))}
            />
          </Reveal>
        )}
      </div>
    </section>
  );
}
