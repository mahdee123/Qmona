"use client";

import { use } from "react";
import { GalleryManager } from "@/features/admin/gallery-manager";
import { RequireCap } from "@/features/admin/shell";
import { ResourceEditor } from "@/features/admin/resource-editor";
import { RESOURCES } from "@/features/admin/resources";

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireCap cap="manage_content">
      <ResourceEditor key={id} config={RESOURCES.projects} basePath="/admin/projects" id={id}>
        {(item) => <GalleryManager projectId={String(item.id)} />}
      </ResourceEditor>
    </RequireCap>
  );
}
