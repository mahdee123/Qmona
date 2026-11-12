"use client";

import Link from "next/link";
import { RequireCap } from "@/features/admin/shell";
import { RESOURCES } from "@/features/admin/resources";
import { PageHeader } from "@/features/admin/ui";

const KEYS = ["service-categories", "product-types", "technologies", "blog-categories", "blog-tags", "blog-authors", "socials"];

export default function TaxonomiesPage() {
  return (
    <RequireCap cap="manage_content">
      <PageHeader title="Taxonomies & lists" description="Separate, editable lists used for filtering, forms and metadata. Services and industries have their own sections." />
      <ul className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
        {KEYS.map((k) => (
          <li key={k}>
            <Link href={`/admin/content/${k}`} className="block rounded-[16px] border border-line bg-card p-5 hover:border-ink">
              <span className="block text-[1rem] font-bold">{RESOURCES[k].title}</span>
              <span className="mt-1 block text-[0.8125rem] text-muted">{RESOURCES[k].description || `Manage ${RESOURCES[k].title.toLowerCase()}.`}</span>
            </Link>
          </li>
        ))}
      </ul>
    </RequireCap>
  );
}
