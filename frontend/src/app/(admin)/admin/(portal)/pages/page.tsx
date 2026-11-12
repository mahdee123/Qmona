"use client";

import Link from "next/link";
import { errorMessage, listOf, useApi } from "@/features/admin/hooks";
import { RequireCap } from "@/features/admin/shell";
import { Empty, ErrorBox, Loading, PageHeader, StatusBadge } from "@/features/admin/ui";

interface Page { id: string; slug: string; title: string; is_published: boolean; sections_count: number; updated_at: string }

export default function PagesAdmin() {
  const { data, loading, error, reload } = useApi<Page[]>("/manage/pages/");
  return (
    <RequireCap cap="manage_content">
      <PageHeader title="Pages & sections" description="Control the order, visibility, copy and motion of every section on the homepage and other pages." />
      {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
      {loading && !data ? <Loading /> : listOf(data).length === 0 ? <Empty>No pages yet. Run <code>npm run seed</code> in the backend.</Empty> : (
        <ul className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
          {listOf(data).map((p) => (
            <li key={p.id}>
              <Link href={`/admin/pages/${p.slug}`} className="block rounded-[16px] border border-line bg-card p-5 hover:border-ink">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[1rem] font-bold">{p.title}</span>
                  <StatusBadge value={p.is_published ? "published" : "draft"} />
                </span>
                <span className="mt-1 block text-[0.8125rem] text-muted">/{p.slug === "home" ? "" : p.slug} · {p.sections_count} sections</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RequireCap>
  );
}
