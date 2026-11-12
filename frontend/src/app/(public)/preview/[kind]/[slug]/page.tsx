import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import type { CMSPage, LegalPage, PostDetail, ProjectDetail } from "@/types";
import { ButtonLink } from "@/components/ui/button";
import { SectionRenderer } from "@/components/sections/renderer";
import { PostDetailView } from "@/features/blog/post-detail";
import { LegalView } from "@/features/cms/legal-view";
import { ProjectDetailView } from "@/features/projects/project-detail";
import { ApiError, getPreview } from "@/lib/api";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

type Props = { params: Promise<{ kind: string; slug: string }> };

function Banner({ status, editHref }: { status?: string; editHref: string }) {
  return (
    <div className="container-q pt-4">
      <div role="status" className="flex flex-col gap-3 rounded-[20px] bg-ink px-5 py-4 text-white tablet:flex-row tablet:items-center tablet:justify-between">
        <p className="flex items-center gap-3 text-[0.9375rem]">
          <Eye className="h-4 w-4 text-accent-light" aria-hidden="true" />
          Preview — visible only to signed-in editors.{status ? ` Current status: ${status}.` : ""}
        </p>
        <ButtonLink href={editHref} size="sm" variant="light">Back to editor</ButtonLink>
      </div>
    </div>
  );
}

/** Authenticated preview of unpublished content (server-side, session cookie forwarded, never cached). */
export default async function PreviewPage({ params }: Props) {
  const { kind, slug } = await params;
  if (!["project", "post", "legal", "page"].includes(kind)) notFound();
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  let data: (ProjectDetail | PostDetail | LegalPage | CMSPage) & { _status?: string } | null = null;
  try {
    data = await getPreview(kind, slug, cookieHeader);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return (
        <section className="container-q py-32 text-center">
          <h1 className="t-h2">Sign in to preview</h1>
          <p className="t-lead mt-4">Previews of unpublished content are available to content editors only.</p>
          <div className="mt-8 flex justify-center"><ButtonLink href={`/admin/login?next=/preview/${kind}/${slug}`} arrow>Sign in</ButtonLink></div>
        </section>
      );
    }
    throw err;
  }
  if (!data) notFound();

  const editHref = kind === "project" ? "/admin/projects" : kind === "post" ? "/admin/blog" : kind === "legal" ? "/admin/legal" : "/admin/pages";
  return (
    <>
      <Banner status={data._status} editHref={editHref} />
      {kind === "project" && <ProjectDetailView project={data as ProjectDetail} related={[]} />}
      {kind === "post" && <PostDetailView post={data as PostDetail} related={[]} />}
      {kind === "legal" && <LegalView page={data as LegalPage} />}
      {kind === "page" && <SectionRenderer sections={(data as CMSPage).sections} />}
    </>
  );
}
