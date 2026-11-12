"use client";

import { RequireCap } from "@/features/admin/shell";
import { ResourceList } from "@/features/admin/resource-list";
import { RESOURCES } from "@/features/admin/resources";

export default function ProjectsPage() {
  return (
    <RequireCap cap="manage_content">
      <ResourceList config={RESOURCES.projects} basePath="/admin/projects" />
    </RequireCap>
  );
}
