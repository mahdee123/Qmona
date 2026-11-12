import type { Link, Section } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProjectCard } from "@/features/projects/project-card";
import { getProjects } from "@/lib/api";
import { SAMPLE_PROJECTS, SampleChip } from "./sample-content";
import { SectionShell } from "./shell";
import { roleClass } from "@/lib/section-style";

type ProjectsContent = { limit?: number; cta?: Link; featured_only?: boolean; show_sample_content?: boolean };

export async function ProjectsSection({ section }: { section: Section<ProjectsContent> }) {
  const c = section.content;
  const { results } = await getProjects({ page_size: c.limit || 6, featured: c.featured_only });
  const sample = !results.length && !!c.show_sample_content;
  if (!results.length && !sample) return null;
  const items = sample ? SAMPLE_PROJECTS.slice(0, c.limit || 6) : results;
  return (
    <SectionShell id="work">
      <SectionHeading label={section.label} headline={section.headline} subheadline={section.subheadline} align={section.variant === "default" ? "left" : "center"} style={section.style} />
      {sample && <SampleChip className="mt-6 text-center" />}
      <div className="panel mt-12 grid gap-x-6 gap-y-10 p-4 tablet:mt-16 tablet:grid-cols-2 tablet:p-6">
        {items.map((p, i) => (
          <Reveal key={p.id} delay={(i % 2) * 0.08} y={24}>
            <ProjectCard project={p} href={sample ? "/work" : undefined} style={section.style} />
          </Reveal>
        ))}
      </div>
      {c.cta && (
        <div className="mt-8 flex justify-end">
          <ButtonLink href={c.cta.url} className={roleClass(section.style, "button")} variant="secondary">{c.cta.label}</ButtonLink>
        </div>
      )}
    </SectionShell>
  );
}
