"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { errorMessage, listOf, useApi } from "@/features/admin/hooks";
import { INQUIRY_STATUSES } from "@/features/admin/constants";
import { RequireCap } from "@/features/admin/shell";
import { adminInput, Btn, Empty, ErrorBox, Loading, PageHeader, SelectBox, StatusBadge } from "@/features/admin/ui";

interface Row {
  id: string; reference: string; inquiry_type: string; full_name: string; email: string; company: string; topic: string;
  subject: string; support_category: string; service_title: string | null; industry_name: string | null; status: string;
  is_read: boolean; is_archived: boolean; assigned_to: { id: string; name: string } | null; notification_status: string; created_at: string;
}

const FILTER_KEYS = ["search", "inquiry_type", "status", "is_read", "assigned_to", "service", "industry", "date_from", "date_to", "archived", "notification_status", "page"];

function InquiriesInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) || "";
  const [search, setSearch] = useState(get("search"));
  useEffect(() => setSearch(params.get("search") || ""), [params]);

  const qs = new URLSearchParams();
  FILTER_KEYS.forEach((k) => get(k) && qs.set(k, get(k)));
  qs.set("page_size", "25");
  const { data, loading, error, reload } = useApi<{ results: Row[]; count: number; page: number; total_pages: number }>(`/manage/inquiries/?${qs}`);
  const { data: services } = useApi<{ slug: string; title: string }[]>("/services/");
  const { data: industries } = useApi<{ slug: string; name: string }[]>("/industries/");
  const { data: assignees } = useApi<{ id: string; name: string }[]>("/manage/inquiries/assignees/");

  function setParam(k: string, v: string) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    router.push(`${pathname}?${next}`);
  }

  const exportQs = new URLSearchParams(qs);
  exportQs.delete("page");
  exportQs.delete("page_size");

  return (
    <div>
      <PageHeader
        title="Inquiries & support"
        description="Project inquiries and support requests from the website. Opening an inquiry marks it as read."
        actions={<a href={`/api/v1/manage/inquiries/export/?${exportQs}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-[0.875rem] font-medium hover:bg-page"><Download className="h-4 w-4" /> Export CSV</a>}
      />
      <div className="mb-4 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
        <form className="relative tablet:col-span-2" onSubmit={(e) => { e.preventDefault(); setParam("search", search); }}>
          <label htmlFor="inq-search" className="sr-only">Search inquiries</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="inq-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, company, message or reference" className={cn(adminInput, "h-10 pl-9")} />
        </form>
        <SelectBox id="f-type" value={get("inquiry_type")} onChange={(v) => setParam("inquiry_type", v)} placeholder="All types" options={[{ value: "contact", label: "Project inquiries" }, { value: "support", label: "Support requests" }]} />
        <SelectBox id="f-status" value={get("status")} onChange={(v) => setParam("status", v)} placeholder="All statuses" options={INQUIRY_STATUSES} />
        <SelectBox id="f-read" value={get("is_read")} onChange={(v) => setParam("is_read", v)} placeholder="Read & unread" options={[{ value: "false", label: "Unread" }, { value: "true", label: "Read" }]} />
        <SelectBox id="f-assigned" value={get("assigned_to")} onChange={(v) => setParam("assigned_to", v)} placeholder="Anyone" options={[{ value: "me", label: "Assigned to me" }, { value: "none", label: "Unassigned" }, ...listOf(assignees).map((a) => ({ value: String(a.id), label: a.name }))]} />
        <SelectBox id="f-service" value={get("service")} onChange={(v) => setParam("service", v)} placeholder="All services" options={listOf(services).map((s) => ({ value: s.slug, label: s.title }))} />
        <SelectBox id="f-industry" value={get("industry")} onChange={(v) => setParam("industry", v)} placeholder="All industries" options={listOf(industries).map((s) => ({ value: s.slug, label: s.name }))} />
        <div className="flex gap-2">
          <label htmlFor="f-from" className="sr-only">From date</label>
          <input id="f-from" type="date" value={get("date_from")} onChange={(e) => setParam("date_from", e.target.value)} className={cn(adminInput, "h-10")} />
          <label htmlFor="f-to" className="sr-only">To date</label>
          <input id="f-to" type="date" value={get("date_to")} onChange={(e) => setParam("date_to", e.target.value)} className={cn(adminInput, "h-10")} />
        </div>
        <SelectBox id="f-archived" value={get("archived")} onChange={(v) => setParam("archived", v)} placeholder="Active (not archived)" options={[{ value: "true", label: "Archived only" }, { value: "all", label: "Active + archived" }]} />
        <Btn onClick={() => router.push(pathname)}>Reset filters</Btn>
      </div>

      {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
      {loading && !data ? <Loading /> : !data?.results.length ? <Empty>No inquiries match these filters.</Empty> : (
        <>
          <div className="overflow-x-auto rounded-[16px] border border-line bg-card">
            <table className="w-full min-w-[820px] text-left text-[0.875rem]">
              <thead className="border-b border-line bg-page/60 text-[0.75rem] uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-medium">From</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Topic / subject</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Type</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Assigned</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.id} className={cn("border-b border-line last:border-0 hover:bg-page/40", !r.is_read && "bg-accent-soft/40")}>
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/inquiries/${r.id}`} className="flex items-center gap-2 font-medium text-ink hover:underline">
                        {!r.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                        {r.full_name}
                      </Link>
                      <span className="block text-[0.8125rem] text-muted">{r.email}{r.company ? ` · ${r.company}` : ""}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.topic || r.subject || "—"}
                      <span className="block text-[0.75rem] text-muted">{[r.service_title, r.industry_name, r.support_category].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge value={r.inquiry_type === "support" ? "support" : "project"} tone={r.inquiry_type === "support" ? "blue" : "gray"} /></td>
                    <td className="px-3 py-2.5">
                      <StatusBadge value={r.status} />
                      {r.notification_status === "failed" && <span className="ml-1"><StatusBadge value="email failed" tone="red" /></span>}
                      {r.is_archived && <span className="ml-1"><StatusBadge value="archived" tone="gray" /></span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted">{r.assigned_to?.name || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">{formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })}<span className="block text-[0.75rem]">{r.reference}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-[0.875rem] text-muted">
            <span>{data.count} total · page {data.page} of {data.total_pages}</span>
            <div className="flex gap-2">
              <Btn disabled={data.page <= 1} onClick={() => setParam("page", String(data.page - 1))}>Previous</Btn>
              <Btn disabled={data.page >= data.total_pages} onClick={() => setParam("page", String(data.page + 1))}>Next</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <RequireCap cap="manage_inquiries">
      <Suspense fallback={<Loading />}><InquiriesInner /></Suspense>
    </RequireCap>
  );
}
