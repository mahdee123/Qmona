import { Check } from "lucide-react";
import type { Link, PricingPlan, Section } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { Badge, IconPill } from "@/components/ui/pill";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPricing, getTestimonials } from "@/lib/api";
import { roleClass, type SectionStyle } from "@/lib/section-style";
import { cn, formatMoney } from "@/lib/utils";
import { AddonToggle } from "./addon-toggle";
import { SAMPLE_PLANS, SAMPLE_TESTIMONIALS, SampleChip, type SamplePlan } from "./sample-content";
import { CtaCard, SectionShell } from "./shell";
import { TestimonialCard } from "./testimonials";

const BILLING: Record<PricingPlan["billing"], string> = { one_time: "One time", monthly: "/ month", custom: "" };

function Plan({ plan, style }: { plan: SamplePlan; style?: SectionStyle }) {
  const dark = plan.variant === "dark";
  const highlight = plan.variant === "highlight";
  return (
    <article
      className={cn(
        roleClass(style, "card", "relative flex h-full flex-col gap-7 overflow-hidden rounded-[28px] p-7", dark || !highlight ? ["bg"] : []),
        dark ? "bg-ink-deep text-white" : highlight ? "bg-card shadow-[var(--shadow-soft)]" : "bg-transparent",
      )}
    >
      {highlight && <div aria-hidden="true" className="halftone absolute inset-x-0 top-0 h-56 text-accent/40 [mask-image:radial-gradient(80%_100%_at_100%_0%,#000_10%,transparent_70%)]" />}
      <div className="relative space-y-5">
        <IconPill icon={plan.icon_key} className={dark ? "bg-card text-ink" : undefined} />
        <div className="flex items-center gap-3">
          <h3 className={roleClass(style, "card_title", "text-[1.5rem] font-medium tracking-[-0.035em]")}>{plan.name}</h3>
          {plan.badge && <Badge className="bg-accent/20 px-3 py-1 text-[0.8125rem] font-medium text-accent">{plan.badge}</Badge>}
        </div>
        {plan.description && <p className={roleClass(style, "card_text", cn("text-[1.0625rem] leading-snug", dark ? "text-white/70" : "text-muted"))}>{plan.description}</p>}
      </div>
      <p className="relative flex items-baseline gap-2">
        {plan.price_prefix && <span className={cn("text-[1rem]", dark ? "text-white/70" : "text-muted")}>{plan.price_prefix}</span>}
        <span className="text-[2.75rem] font-bold leading-none tracking-[-0.045em]">
          {plan.price_text ?? (plan.price_amount ? formatMoney(plan.price_amount, plan.currency) : "Custom")}
        </span>
        {BILLING[plan.billing] && <span className={cn("text-[1rem]", dark ? "text-white/70" : "text-muted")}>{BILLING[plan.billing]}</span>}
      </p>
      <ButtonLink href={plan.cta_url} size="lg" variant={highlight ? "primary" : dark ? "secondary" : "dark"} arrow={highlight} className="relative w-full justify-between">
        {plan.cta_label}
      </ButtonLink>
      {plan.features.length > 0 && (
        <ul className="relative space-y-3">
          {plan.features.map((f) => (
            <li key={f} className={cn("flex items-start gap-3 text-[0.9375rem]", dark ? "text-white" : "text-body")}>
              <Check className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-white/80" : "text-ink")} aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      )}
      {plan.addon && <AddonToggle label={plan.addon.label} price={plan.addon.price} />}
    </article>
  );
}

type PricingContent = {
  note?: string;
  show_sample_content?: boolean;
  cta_title?: string;
  cta_text?: string;
  cta?: Link;
};

export async function PricingSection({ section }: { section: Section<PricingContent> }) {
  const c = section.content;
  const [realPlans, testimonials] = await Promise.all([getPricing(), getTestimonials()]);
  const sample = !realPlans.length && !!c.show_sample_content;
  if (!realPlans.length && !sample) return null;
  const plans: SamplePlan[] = sample ? SAMPLE_PLANS : realPlans;
  const featured = testimonials.find((t) => t.is_featured) ?? testimonials[0] ?? (sample ? SAMPLE_TESTIMONIALS[0] : null);
  return (
    <SectionShell id="pricing">
      <SectionHeading label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
      {sample && <SampleChip className="mt-6 text-center" />}
      <div className="panel mt-12 grid gap-3 p-3 tablet:mt-16 desktop:grid-cols-3">
        {plans.map((plan, i) => (
          <Reveal key={plan.id} delay={i * 0.08}><Plan plan={plan} style={section.style} /></Reveal>
        ))}
        {(featured || c.cta_title) && (
          <div className="grid gap-3 desktop:col-span-3 desktop:grid-cols-[2fr_1fr]">
            {featured && <Reveal><TestimonialCard t={featured} style={section.style} /></Reveal>}
            <Reveal delay={0.08} className={featured ? undefined : "desktop:col-span-2"}>
              <CtaCard tone="dark" title={c.cta_title} text={c.cta_text} cta={c.cta} className="h-full" style={section.style} />
            </Reveal>
          </div>
        )}
      </div>
      {section.content.note && <p className="t-small mt-6 text-center">{section.content.note}</p>}
    </SectionShell>
  );
}
