import type { Link, Section } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { PostCardFeatured, PostCardRow } from "@/features/blog/post-card";
import { getPosts } from "@/lib/api";
import { SectionShell } from "./shell";
import { roleClass } from "@/lib/section-style";

/** Hidden automatically until at least one article is published (none are seeded). */
export async function BlogSection({ section }: { section: Section<{ limit?: number; cta?: Link }> }) {
  const { results } = await getPosts({ page_size: section.content.limit || 3 });
  if (!results.length) return null;
  const [first, ...rest] = results;
  return (
    <SectionShell id="blog">
      <SectionHeading align="left" label={section.label} headline={section.headline} subheadline={section.subheadline} style={section.style} />
      <div className="mt-12 grid gap-10 tablet:mt-16 desktop:grid-cols-2 desktop:gap-6">
        <Reveal><PostCardFeatured post={first} /></Reveal>
        {rest.length > 0 && (
          <div className="flex flex-col gap-8">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={0.08 * (i + 1)}><PostCardRow post={p} /></Reveal>
            ))}
          </div>
        )}
      </div>
      {section.content.cta && (
        <div className="mt-10 flex justify-end">
          <ButtonLink href={section.content.cta.url} className={roleClass(section.style, "button")} variant="secondary">{section.content.cta.label}</ButtonLink>
        </div>
      )}
    </SectionShell>
  );
}
