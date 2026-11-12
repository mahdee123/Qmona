"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Media } from "@/types";
import { api, ClientApiError } from "@/lib/client-api";
import { cn, formatDate } from "@/lib/utils";
import { errorMessage, listOf, useApi, useToast } from "./hooks";
import { Thumb } from "./media-picker";
import type { ResourceConfig } from "./resources";
import { adminInput, Btn, ConfirmDialog, Empty, ErrorBox, Loading, PageHeader, SelectBox, StatusBadge, Toggle } from "./ui";

type Row = Record<string, unknown> & { id: string };

function Cell({ row, col }: { row: Row; col: ResourceConfig["columns"][number] }) {
  const v = row[col.key];
  switch (col.type) {
    case "bool":
      return v ? <StatusBadge value="yes" tone="green" /> : <span className="text-subtle">—</span>;
    case "badge":
      return v ? <StatusBadge value={String(v)} /> : <span className="text-subtle">—</span>;
    case "media":
      return <Thumb media={(v as Media) || null} className="h-10 w-14" />;
    case "date":
      return <span className="whitespace-nowrap">{v ? formatDate(String(v)) : "—"}</span>;
    default:
      return <span>{v === null || v === undefined || v === "" ? "—" : String(v)}</span>;
  }
}

export function ResourceList({ config, basePath }: { config: ResourceConfig; basePath: string }) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [refs, setRefs] = useState<{ label: string }[] | null>(null);

  const path = useMemo(() => {
    const sp = new URLSearchParams({ page_size: "50", page: String(page) });
    if (query) sp.set("search", query);
    Object.entries(filters).forEach(([k, v]) => v && sp.set(k, v));
    return `${config.endpoint}?${sp}`;
  }, [config.endpoint, query, filters, page]);
  const { data, loading, error, reload, setData } = useApi<Row[] | { results: Row[]; count: number; total_pages: number }>(path);
  const rows = listOf(data);
  const paged = data && !Array.isArray(data) ? data : null;
  const canReorder = config.orderable && !query && !Object.values(filters).some(Boolean) && (!paged || paged.total_pages <= 1);

  async function togglePublish(row: Row) {
    const field = config.publishField!;
    const next = !row[field];
    setData((d) => (Array.isArray(d) ? d.map((r) => (r.id === row.id ? { ...r, [field]: next } : r)) : d ? { ...d, results: d.results.map((r) => (r.id === row.id ? { ...r, [field]: next } : r)) } : d));
    try {
      await api(`${config.endpoint}${row.id}/`, { method: "PATCH", body: { [field]: next } });
      toast(next ? "Now visible on the website." : "Hidden from the website.");
    } catch (e) {
      toast(errorMessage(e), "error");
      reload();
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...rows];
    const [it] = next.splice(index, 1);
    next.splice(index + dir, 0, it);
    setData((d) => (Array.isArray(d) ? next : d ? { ...d, results: next } : d));
    try {
      await api(`${config.endpoint}reorder/`, { method: "POST", body: { ids: next.map((r) => r.id) } });
    } catch (e) {
      toast(errorMessage(e), "error");
      reload();
    }
  }

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api(`${config.endpoint}${confirm.id}/`, { method: "DELETE" });
      toast(`${config.singular} deleted.`);
      setConfirm(null);
      reload();
    } catch (e) {
      if (e instanceof ClientApiError && e.status === 409) {
        setRefs((e.body.references as { label: string }[]) || []);
      }
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const label = (r: Row) => String(r[config.columns.find((c) => c.type !== "media")!.key] ?? config.singular);

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={<Btn variant="primary" href={`${basePath}/new`}><Plus className="h-4 w-4" /> New {config.singular.toLowerCase()}</Btn>}
      />
      {config.note && <p className="mb-5 rounded-[14px] border border-warning/30 bg-warning/5 px-4 py-3 text-[0.875rem] text-ink">{config.note}</p>}

      {(config.searchable || config.filters) && (
        <div className="mb-4 flex flex-col gap-3 tablet:flex-row">
          {config.searchable && (
            <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search); }}>
              <label htmlFor="resource-search" className="sr-only">Search</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input id="resource-search" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => { setPage(1); setQuery(search); }} placeholder={`Search ${config.title.toLowerCase()}…`} className={cn(adminInput, "h-10 pl-9")} />
            </form>
          )}
          {config.filters?.map((f) => (
            <div key={f.name} className="tablet:w-56">
              <label htmlFor={`filter-${f.name}`} className="sr-only">{f.label}</label>
              <SelectBox id={`filter-${f.name}`} value={filters[f.name] || ""} onChange={(v) => { setPage(1); setFilters((s) => ({ ...s, [f.name]: v })); }} options={f.options} placeholder={`All ${f.label.toLowerCase()}`} />
            </div>
          ))}
        </div>
      )}

      {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
      {loading && !data ? <Loading /> : rows.length === 0 ? (
        <Empty>Nothing here yet. <Link href={`${basePath}/new`} className="font-medium text-ink underline">Create the first {config.singular.toLowerCase()}</Link>.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-line bg-card">
          <table className="w-full min-w-[640px] text-left text-[0.875rem]">
            <thead className="border-b border-line bg-page/60 text-[0.75rem] uppercase tracking-wide text-muted">
              <tr>
                {canReorder && <th scope="col" className="w-20 px-3 py-2.5"><span className="sr-only">Order</span></th>}
                {config.columns.map((c) => <th key={c.key} scope="col" className="px-3 py-2.5 font-medium">{c.label}</th>)}
                {config.publishField && <th scope="col" className="px-3 py-2.5 font-medium">Visible</th>}
                <th scope="col" className="px-3 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-page/40">
                  {canReorder && (
                    <td className="px-2 py-2">
                      <div className="flex">
                        <button type="button" aria-label={`Move ${label(row)} up`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-page hover:text-ink disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" aria-label={`Move ${label(row)} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-page hover:text-ink disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      </div>
                    </td>
                  )}
                  {config.columns.map((c, ci) => (
                    <td key={c.key} className="px-3 py-2.5 align-middle">
                      {ci === config.columns.findIndex((x) => x.type !== "media") ? (
                        <Link href={`${basePath}/${row.id}`} className="font-medium text-ink hover:underline"><Cell row={row} col={c} /></Link>
                      ) : <Cell row={row} col={c} />}
                    </td>
                  ))}
                  {config.publishField && (
                    <td className="px-3 py-2.5">
                      <Toggle id={`pub-${row.id}`} checked={!!row[config.publishField]} onChange={() => togglePublish(row)} label={`Visible on website: ${label(row)}`} hideLabel />
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      {config.publicUrl?.(row) && (
                        <a href={config.publicUrl(row)!} target="_blank" rel="noopener" aria-label={`View ${label(row)} on website`} className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><ExternalLink className="h-4 w-4" /></a>
                      )}
                      <Link href={`${basePath}/${row.id}`} aria-label={`Edit ${label(row)}`} className="rounded-full p-2 text-muted hover:bg-page hover:text-ink"><Pencil className="h-4 w-4" /></Link>
                      <button type="button" aria-label={`Delete ${label(row)}`} onClick={() => { setRefs(null); setConfirm(row); }} className="rounded-full p-2 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {paged && paged.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[0.875rem] text-muted">
          <span>{paged.count} total</span>
          <div className="flex gap-2">
            <Btn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Btn>
            <Btn disabled={page >= paged.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={`Delete ${config.singular.toLowerCase()}?`}
        message={<>This permanently deletes <strong className="text-ink">{confirm ? label(confirm) : ""}</strong>. This cannot be undone.</>}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        busy={busy}
      >
        {refs && refs.length > 0 && (
          <ul className="list-disc pl-5 text-[0.8125rem] text-danger">{refs.map((r, i) => <li key={i}>{r.label}</li>)}</ul>
        )}
      </ConfirmDialog>
    </div>
  );
}
