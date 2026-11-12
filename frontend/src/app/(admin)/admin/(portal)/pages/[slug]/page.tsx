"use client";

import { use } from "react";
import { PageSectionsEditor } from "@/features/admin/section-editor";
import { RequireCap } from "@/features/admin/shell";

export default function PageSectionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <RequireCap cap="manage_content">
      <PageSectionsEditor key={slug} slug={slug} />
    </RequireCap>
  );
}
