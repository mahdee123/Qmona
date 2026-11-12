"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { RequireCap } from "@/features/admin/shell";
import { ResourceEditor } from "@/features/admin/resource-editor";
import { RESOURCES } from "@/features/admin/resources";

export default function ResourceEditPage({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = use(params);
  const config = RESOURCES[resource];
  if (!config) notFound();
  return (
    <RequireCap cap="manage_content">
      <ResourceEditor key={id} config={config} basePath={`/admin/content/${resource}`} id={id} />
    </RequireCap>
  );
}
