"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { errorMessage, useApi } from "@/features/admin/hooks";
import { RequireCap } from "@/features/admin/shell";
import { Btn, Empty, ErrorBox, Loading, PageHeader, SelectBox, StatusBadge } from "@/features/admin/ui";

interface Event { id: string; actor_email: string | null; action: string; target_model: string; target_id: string; details: Record<string, unknown>; ip_address: string | null; created_at: string }

const ACTIONS = ["create", "update", "publish", "delete", "status_change", "export", "notification_retry", "login", "login_failed", "logout"];

function Audit() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<{ results: Event[]; page: number; total_pages: number; count: number }>(`/manage/audit-events/?page_size=50&page=${page}${action ? `&action=${action}` : ""}`);
  return (
    <div>
      <PageHeader title="Audit log" description="Important admin actions: content changes, publication, deletions, exports, logins and inquiry status changes." />
      <div className="mb-4 w-64"><SelectBox id="audit-action" value={action} onChange={(v) => { setPage(1); setAction(v); }} placeholder="All actions" options={ACTIONS.map((a) => ({ value: a, label: a.replace(/_/g, " ") }))} /></div>
      {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
      {loading && !data ? <Loading /> : !data?.results.length ? <Empty>No events.</Empty> : (
        <>
          <div className="overflow-x-auto rounded-[16px] border border-line bg-card">
            <table className="w-full min-w-[760px] text-left text-[0.8125rem]">
              <thead className="border-b border-line bg-page/60 text-[0.75rem] uppercase tracking-wide text-muted">
                <tr><th className="px-3 py-2.5">When</th><th className="px-3 py-2.5">Who</th><th className="px-3 py-2.5">Action</th><th className="px-3 py-2.5">Target</th><th className="px-3 py-2.5">Details</th></tr>
              </thead>
              <tbody>
                {data.results.map((e) => (
                  <tr key={e.id} className="border-b border-line align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(e.created_at, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                    <td className="px-3 py-2">{e.actor_email || "—"}<span className="block text-muted">{e.ip_address}</span></td>
                    <td className="px-3 py-2"><StatusBadge value={e.action} tone={e.action === "delete" || e.action === "login_failed" ? "red" : e.action === "publish" ? "green" : "gray"} /></td>
                    <td className="px-3 py-2">{e.target_model}<span className="block max-w-[14rem] truncate text-muted">{e.target_id}</span></td>
                    <td className="px-3 py-2"><code className="block max-w-md truncate text-[0.75rem] text-muted" title={JSON.stringify(e.details)}>{JSON.stringify(e.details)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Btn disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Btn>
            <Btn disabled={data.page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
          </div>
        </>
      )}
    </div>
  );
}

export default function AuditPage() {
  return <RequireCap cap="view_audit_log"><Audit /></RequireCap>;
}
