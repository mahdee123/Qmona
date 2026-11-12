"use client";

import { use } from "react";
import { RequireCap } from "@/features/admin/shell";
import { ResourceEditor } from "@/features/admin/resource-editor";
import { RESOURCES } from "@/features/admin/resources";

export default function PostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireCap cap="manage_content">
      <ResourceEditor key={id} config={RESOURCES.posts} basePath="/admin/blog" id={id} />
    </RequireCap>
  );
}
