"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { RequireCap } from "@/features/admin/shell";
import { ResourceList } from "@/features/admin/resource-list";
import { RESOURCES } from "@/features/admin/resources";

export default function ResourceListPage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = use(params);
  const config = RESOURCES[resource];
  if (!config) notFound();
  return (
    <RequireCap cap="manage_content">
      <ResourceList config={config} basePath={`/admin/content/${resource}`} />
    </RequireCap>
  );
}
