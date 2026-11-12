import type { LegalPage } from "@/types";
import { Reveal } from "@/components/ui/motion";
import { BlockRenderer } from "@/components/ui/rich-text";
import { formatDate } from "@/lib/utils";

export function LegalView({ page }: { page: LegalPage }) {
  return (
    <article className="container-q pb-20 pt-12 tablet:pt-20">
      <Reveal immediate y={20} className="mx-auto max-w-[54rem] space-y-5">
        <h1 className="t-h1">{page.title}</h1>
        {page.summary && <p className="t-lead">{page.summary}</p>}
        <p className="t-small">
          Last updated {formatDate(page.last_reviewed || page.updated_at)}
        </p>
      </Reveal>
      <div className="mx-auto mt-10 max-w-[54rem] rounded-[28px] bg-card p-6 shadow-[var(--shadow-card)] tablet:p-10">
        <BlockRenderer blocks={page.body} />
      </div>
    </article>
  );
}
