"use client";

import { useMe } from "@/features/admin/hooks";
import { Card, PageHeader } from "@/features/admin/ui";

export default function AccountPage() {
  const me = useMe();
  if (!me) return null;
  const caps = Object.entries(me.capabilities).filter(([, v]) => v).map(([k]) => k.replace(/_/g, " "));
  return (
    <div className="max-w-2xl">
      <PageHeader title="Your account" />
      <Card>
        <dl className="grid gap-3 text-[0.9375rem] tablet:grid-cols-[160px_1fr]">
          <dt className="text-muted">Name</dt><dd>{[me.first_name, me.last_name].filter(Boolean).join(" ") || me.username}</dd>
          <dt className="text-muted">Email</dt><dd>{me.email}</dd>
          <dt className="text-muted">Role</dt><dd>{me.role_display}</dd>
          <dt className="text-muted">Permissions</dt><dd className="capitalize">{caps.join(", ")}</dd>
        </dl>
        <p className="mt-5 text-[0.8125rem] text-muted">To change your password, ask a Super Admin (Admin → Users → Set password).</p>
      </Card>
    </div>
  );
}
