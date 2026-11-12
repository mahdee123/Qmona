import Image from "next/image";
import type { Link, ProcessStep, Section } from "@/types";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/motion";
import { NumberPill } from "@/components/ui/pill";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProcess } from "@/lib/api";
import { CtaCard, SectionShell } from "./shell";
import { roleClass } from "@/lib/section-style";

/** Visual area for a step: uploaded image if present, otherwise a composed icon + deliverables illustration. */
function StepVisual({ step, index }: { step: ProcessStep; index: number }) {
  if (step.image) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-[20px] bg-panel">
        <Image src={step.image.url} alt={step.image.alt_text || ""} fill sizes="(min-width: 1200px) 640px, 100vw" className="object-cover" />
      </div>
    );
  }
  const dark = index % 2 === 1;
  return (
    <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[20px] ${dark ? "bg-ink-deep" : "bg-panel"}`}>
      <div aria-hidden="true" className={`halftone-center absolute inset-0 ${dark ? "text-accent/60" : "text-accent/35"}`} />
      <div className="relative flex flex-col items-center gap-5">
        <span className={`inline-flex h-20 w-20 items-center justify-center rounded-[26px] shadow-[var(--shadow-pill)] ${dark ? "bg-card text-ink" : "bg-ink text-white"}`}>
          <Icon name={step.icon_key} className="h-8 w-8" />
        </span>
        {step.deliverables.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-2 px-6" aria-label="Deliverables">
            {step.deliverables.slice(0, 3).map((d) => (
              <li key={d} className={`rounded-full px-3 py-1.5 text-[0.8125rem] shadow-[var(--shadow-button)] ${dark ? "bg-white/10 text-white" : "bg-card text-ink"}`}>{d}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export async function ProcessSection({ section }: { section: Section<{ cta_title?: string; cta_text?: string; cta?: Link }> }) {
  const steps = await getProcess();
  if (!steps.length) return null;
  const c = section.content;
  return (
    <SectionShell id="process">
      <SectionHeading label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
      <ol className="mt-12 grid gap-4 tablet:mt-16 tablet:grid-cols-2 tablet:gap-6">
        {steps.map((step, i) => (
          <Reveal as="li" key={step.id} delay={(i % 2) * 0.08}>
            <article className={roleClass(section.style, "card", "flex h-full flex-col gap-6 rounded-[28px] bg-card p-3 pb-7 shadow-[var(--shadow-card)]", ["padding"])}>
              <StepVisual step={step} index={i} />
              <div className="space-y-3 px-3">
                <NumberPill n={i + 1} />
                <h3 className={roleClass(section.style, "card_title", "pt-3 text-[1.5rem] font-medium tracking-[-0.035em]")}>{step.title}</h3>
                <p className={roleClass(section.style, "card_text", "t-body max-w-md")}>{step.description}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </ol>
      {(c.cta_title || c.cta) && (
        <Reveal className="mt-6">
          <CtaCard title={c.cta_title} text={c.cta_text} cta={c.cta} style={section.style} />
        </Reveal>
      )}
    </SectionShell>
  );
}
