"use client";

import Image from "next/image";
import { ImagePlus, Search, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Media } from "@/types";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { errorMessage, listOf, useApi } from "./hooks";
import { adminInput, Btn, Empty, ErrorBox, Loading, Modal } from "./ui";

export interface MediaRecord extends Omit<Media, "url"> {
  title: string;
  file_url: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export function toMedia(m: MediaRecord): Media {
  return { id: m.id, url: m.file_url, alt_text: m.alt_text, caption: m.caption, width: m.width, height: m.height, mime_type: m.mime_type };
}

export const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,.svg";

export async function uploadMedia(file: File, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  return api<MediaRecord>("/manage/media/", { method: "POST", body: fd });
}

export function Thumb({ media, className }: { media: { url?: string; file_url?: string; alt_text?: string; mime_type?: string } | null; className?: string }) {
  const src = media?.url || media?.file_url;
  if (!src) return <div className={cn("flex items-center justify-center rounded-[10px] bg-page text-subtle", className)}><ImagePlus className="h-5 w-5" /></div>;
  return (
    <div className={cn("relative overflow-hidden rounded-[10px] bg-page", className)}>
      <Image src={src} alt={media?.alt_text || ""} fill sizes="200px" className={media?.mime_type === "image/svg+xml" ? "object-contain p-2" : "object-cover"} unoptimized={media?.mime_type === "image/svg+xml"} />
    </div>
  );
}

/** Modal to pick an existing asset or upload a new one. */
export function MediaPickerModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (m: MediaRecord) => void }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useApi<{ results: MediaRecord[] }>(open ? `/manage/media/?page_size=48${q ? `&search=${encodeURIComponent(q)}` : ""}` : null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const rec = await uploadMedia(files[0]);
      onPick(rec);
      onClose();
    } catch (e) {
      setUploadError(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose media" wide>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 tablet:flex-row">
          <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setQ(search); }}>
            <label htmlFor="media-search" className="sr-only">Search media</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input id="media-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, alt text or file name" className={cn(adminInput, "h-10 pl-9")} />
          </form>
          <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" id="media-picker-upload" onChange={(e) => onFiles(e.target.files)} />
          <Btn variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload new</Btn>
        </div>
        {uploadError && <ErrorBox message={uploadError} />}
        {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
        {loading ? <Loading /> : listOf(data).length === 0 ? <Empty>No media found. Upload an image to get started.</Empty> : (
          <ul className="grid grid-cols-2 gap-3 tablet:grid-cols-4 desktop:grid-cols-6">
            {listOf(data).map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => { onPick(m); onClose(); }} className="group block w-full rounded-[12px] border border-line p-1.5 text-left hover:border-ink focus-visible:border-ink">
                  <Thumb media={m} className="aspect-square" />
                  <span className="mt-1.5 block truncate px-1 text-[0.75rem] text-body">{m.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Single media field: thumbnail + choose / remove. Value is the asset id. */
export function MediaField({ id, value, detail, onChange }: { id: string; value: string | null; detail?: Media | null; onChange: (id: string | null, rec?: MediaRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<MediaRecord | null>(null);
  const needsFetch = !!value && !detail && !(picked && picked.id === value);
  const { data: fetched } = useApi<MediaRecord>(needsFetch ? `/manage/media/${value}/` : null);
  const preview = picked && picked.id === value ? picked : value && detail ? detail : value && fetched ? fetched : null;
  return (
    <div className="flex items-center gap-3">
      <Thumb media={preview as Media | null} className="h-20 w-28 shrink-0" />
      <div className="flex flex-wrap gap-2">
        <Btn id={id} onClick={() => setOpen(true)}>{value ? "Replace" : "Choose image"}</Btn>
        {value && <Btn variant="ghost" onClick={() => { setPicked(null); onChange(null); }}><X className="h-4 w-4" /> Remove</Btn>}
      </div>
      <MediaPickerModal open={open} onClose={() => setOpen(false)} onPick={(m) => { setPicked(m); onChange(m.id, m); }} />
    </div>
  );
}
