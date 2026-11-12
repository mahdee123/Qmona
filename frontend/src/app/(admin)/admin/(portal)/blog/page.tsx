"use client";

import { RequireCap } from "@/features/admin/shell";
import { ResourceList } from "@/features/admin/resource-list";
import { RESOURCES } from "@/features/admin/resources";

export default function BlogAdminPage() {
  return (
    <RequireCap cap="manage_content">
      <ResourceList config={RESOURCES.posts} basePath="/admin/blog" />
    </RequireCap>
  );
}
