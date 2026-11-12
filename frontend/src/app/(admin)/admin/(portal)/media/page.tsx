"use client";

import { Copy, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";
import { cn, formatDate } from "@/lib/utils";
import { errorMessage, listOf, useApi, useToast } from "@/features/admin/hooks";
import { ACCEPT, Thumb, uploadMedia, type MediaRecord } from "@/features/admin/media-picker";
import { RequireCap } from "@/features/admin/shell";
import { adminInput, Btn, Card, ConfirmDialog, Empty, ErrorBox, FormRow, Loading, PageHeader, SelectBox } from "@/features/admin/ui";

interface Detail extends MediaRecord {
  uploaded_by_email: string | null;
  references: { type: string; label: string }[];
}

function bytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function MediaDetail({ id, onChanged, onDeleted }: { id: string; onChanged: () => void; onDeleted: () => void }) {
  const toast = useToast();
  const { data, loading, error, setData } = useApi<Detail>(`/manage/media/${id}/`);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} />;

  async function save() {
    setSaving(true);
    try {
      const res = await api<Detail>(`/manage/media/${id}/`, { method: "PATCH", body: { title: data!.title, alt_text: data!.alt_text, caption: data!.caption } });
      setData(res);
      toast("Details saved.");
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await api(`/manage/media/${id}/`, { method: "DELETE" });
      toast("File deleted.");
      setConfirm(false);
      onDeleted();
    } catch (e) {
      setConfirm(false);
      setBlocked(e instanceof ClientApiError && e.status === 409 ? e.message : errorMessage(e));
    }
  }

  return (
    <Card title="File details">
      <div className="space-y-4">
        <Thumb media={data} className="aspect-[4/3] w-full" />
        <dl className="grid grid-cols-2 gap-2 text-[0.8125rem]">
          <dt className="text-muted">Type</dt><dd>{data.mime_type}</dd>
          <dt className="text-muted">Size</dt><dd>{bytes(data.file_size)}</dd>
          {data.width && <><dt className="text-muted">Dimensions</dt><dd>{data.width} × {data.height}px</dd></>}
          <dt className="text-muted">Original name</dt><dd className="truncate">{data.original_filename}</dd>
          <dt className="text-muted">Uploaded</dt><dd>{formatDate(data.created_at)}{data.uploaded_by_email ? ` by ${data.uploaded_by_email}` : ""}</dd>
        </dl>
        <FormRow id="m-title" label="Title"><input id="m-title" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} className={cn(adminInput, "h-10")} /></FormRow>
        <FormRow id="m-alt" label="Alt text" help="Describe the image for screen-reader users. Leave empty only for purely decorative images.">
          <input id="m-alt" value={data.alt_text} onChange={(e) => setData({ ...data, alt_text: e.target.value })} className={cn(adminInput, "h-10")} />
        </FormRow>
        <FormRow id="m-caption" label="Caption"><input id="m-caption" value={data.caption} onChange={(e) => setData({ ...data, caption: e.target.value })} className={cn(adminInput, "h-10")} /></FormRow>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" loading={saving} onClick={save}>Save details</Btn>
          <Btn onClick={() => { navigator.clipboard?.writeText(data.file_url); toast("URL copied."); }}><Copy className="h-4 w-4" /> Copy URL</Btn>
          <Btn variant="ghost" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /> Delete</Btn>
        </div>
        <div>
          <p className="mb-2 text-[0.8125rem] font-bold">Used in</p>
          {data.references.length === 0 ? <p className="text-[0.8125rem] text-muted">Not used anywhere — safe to delete.</p> : (
            <ul className="list-disc space-y-1 pl-5 text-[0.8125rem]">{data.references.map((r, i) => <li key={i}>{r.label}</li>)}</ul>
          )}
        </div>
        {blocked && <ErrorBox message={blocked} />}
      </div>
      <ConfirmDialog open={confirm} title="Delete this file?" message={data.references.length ? "This file is still in use. Deletion will be refused until it is removed from the places listed." : "The file is permanently removed from storage."} onCancel={() => setConfirm(false)} onConfirm={remove} />
    </Card>
  );
}

function MediaLibrary() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data, loading, error, reload } = useApi<{ results: MediaRecord[]; count: number; total_pages: number }>(
    `/manage/media/?page_size=36&page=${page}${q ? `&search=${encodeURIComponent(q)}` : ""}${type ? `&file_type=${type}` : ""}`,
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const errs: string[] = [];
    for (const f of Array.from(files)) {
      try {
        await uploadMedia(f);
      } catch (e) {
        errs.push(`${f.name}: ${errorMessage(e)}`);
      }
    }
    setUploadErrors(errs);
    if (errs.length < files.length) toast(`${files.length - errs.length} file(s) uploaded.`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Media library"
        description="PNG, JPEG, WebP and SVG (validated; scripts and external references are rejected). Files in use cannot be deleted."
        actions={<>
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="sr-only" id="library-upload" onChange={(e) => onFiles(e.target.files)} />
          <Btn variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload files</Btn>
        </>}
      />
      {uploadErrors.length > 0 && <div className="mb-4"><ErrorBox message={`Some files were rejected — ${uploadErrors.join(" · ")}`} /></div>}
      <div className="mb-4 flex flex-col gap-3 tablet:flex-row">
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search); }}>
          <label htmlFor="lib-search" className="sr-only">Search media</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="lib-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, alt text, caption or file name" className={cn(adminInput, "h-10 pl-9")} />
        </form>
        <div className="tablet:w-48"><SelectBox id="lib-type" value={type} onChange={(v) => { setPage(1); setType(v); }} placeholder="All types" options={[{ value: "image", label: "Raster images" }, { value: "svg", label: "SVG" }]} /></div>
      </div>
      <div className="grid gap-6 desktop:grid-cols-[1fr_360px]">
        <div>
          {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
          {loading && !data ? <Loading /> : listOf(data).length === 0 ? <Empty>No files yet.</Empty> : (
            <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-4 desktop:grid-cols-4">
              {listOf(data).map((m) => (
                <li key={m.id}>
                  <button type="button" aria-pressed={selected === m.id} onClick={() => setSelected(m.id)} className={cn("block w-full rounded-[14px] border bg-card p-1.5 text-left", selected === m.id ? "border-ink ring-2 ring-ink/10" : "border-line hover:border-ink/40")}>
                    <Thumb media={m} className="aspect-square" />
                    <span className="mt-1.5 block truncate px-1 text-[0.75rem]">{m.title}</span>
                    <span className="block px-1 text-[0.6875rem] text-muted">{m.width ? `${m.width}×${m.height}` : "SVG"} · {bytes(m.file_size)}{!m.alt_text && " · no alt"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {data && data.total_pages > 1 && (
            <div className="mt-4 flex justify-end gap-2">
              <Btn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Btn>
              <Btn disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
            </div>
          )}
        </div>
        <div className="desktop:sticky desktop:top-6 desktop:self-start">
          {selected ? <MediaDetail key={selected} id={selected} onChanged={reload} onDeleted={() => { setSelected(null); reload(); }} /> : <Empty>Select a file to see details, usage and alt text.</Empty>}
        </div>
      </div>
    </div>
  );
}

export default function MediaPage() {
  return <RequireCap cap="manage_content"><MediaLibrary /></RequireCap>;
}
