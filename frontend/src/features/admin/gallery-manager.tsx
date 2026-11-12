"use client";

import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { Media } from "@/types";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { errorMessage, listOf, useApi, useToast } from "./hooks";
import { ACCEPT, MediaPickerModal, Thumb, uploadMedia } from "./media-picker";
import { adminInput, Btn, Card, Empty, ErrorBox, Loading, SelectBox } from "./ui";

interface GalleryItem {
  id: string;
  media_asset: string;
  media: Media;
  caption: string;
  alt_text: string;
  kind: string;
  layout: string;
  order: number;
}

/** Ordered mockups / screenshots for a project case study. */
export function GalleryManager({ projectId }: { projectId: string }) {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<GalleryItem[]>(`/manage/project-gallery/?project=${projectId}`);
  const items = listOf(data);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function add(mediaId: string) {
    try {
      await api("/manage/project-gallery/", { method: "POST", body: { project: projectId, media_asset: mediaId, order: items.length, kind: "mockup", layout: "full" } });
      toast("Image added to gallery.");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const rec = await uploadMedia(f);
        await api("/manage/project-gallery/", { method: "POST", body: { project: projectId, media_asset: rec.id, order: items.length, kind: "mockup", layout: "full" } });
      }
      toast("Upload complete.");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
      reload();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function patch(item: GalleryItem, body: Partial<GalleryItem>) {
    setData((d) => (d || []).map((x) => (x.id === item.id ? { ...x, ...body } : x)));
    try {
      await api(`/manage/project-gallery/${item.id}/`, { method: "PATCH", body });
    } catch (e) {
      toast(errorMessage(e), "error");
      reload();
    }
  }

  async function move(i: number, dir: -1 | 1) {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + dir, 0, x);
    setData(next);
    try {
      await api("/manage/project-gallery/reorder/", { method: "POST", body: { ids: next.map((n) => n.id) } });
    } catch (e) {
      toast(errorMessage(e), "error");
      reload();
    }
  }

  async function remove(item: GalleryItem) {
    try {
      await api(`/manage/project-gallery/${item.id}/`, { method: "DELETE" });
      toast("Removed from gallery (the file stays in the media library).");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <Card
      title="Gallery & mockups"
      actions={
        <div className="flex gap-2">
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="sr-only" id="gallery-upload" onChange={(e) => onFiles(e.target.files)} />
          <Btn loading={uploading} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload</Btn>
          <Btn onClick={() => setPicker(true)}>From library</Btn>
        </div>
      }
    >
      <p className="mb-4 text-[0.8125rem] text-muted">The first two images appear beside the challenge, the next two beside the approach, and the rest in the gallery grid. Changes save immediately.</p>
      {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
      {loading && !data ? <Loading /> : items.length === 0 ? <Empty>No gallery images yet.</Empty> : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={item.id} className="flex flex-col gap-3 rounded-[14px] border border-line p-3 tablet:flex-row tablet:items-center">
              <Thumb media={item.media} className="h-20 w-28 shrink-0" />
              <div className="grid flex-1 gap-2 tablet:grid-cols-2">
                <input aria-label="Caption" placeholder="Caption" defaultValue={item.caption} onBlur={(e) => e.target.value !== item.caption && patch(item, { caption: e.target.value })} className={cn(adminInput, "h-9")} />
                <input aria-label="Alt text" placeholder="Alt text (describe the image)" defaultValue={item.alt_text} onBlur={(e) => e.target.value !== item.alt_text && patch(item, { alt_text: e.target.value })} className={cn(adminInput, "h-9")} />
                <SelectBox id={`kind-${item.id}`} value={item.kind} onChange={(v) => patch(item, { kind: v })} options={[{ value: "mockup", label: "Mockup" }, { value: "screenshot", label: "Screenshot" }, { value: "photo", label: "Photo / other" }]} />
                <SelectBox id={`layout-${item.id}`} value={item.layout} onChange={(v) => patch(item, { layout: v })} options={[{ value: "full", label: "Full width" }, { value: "half", label: "Half width" }]} />
              </div>
              <div className="flex gap-1 self-end tablet:self-center">
                <Btn variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Btn>
                <Btn variant="ghost" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Btn>
                <Btn variant="ghost" aria-label="Remove from gallery" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            </li>
          ))}
        </ol>
      )}
      <MediaPickerModal open={picker} onClose={() => setPicker(false)} onPick={(m) => add(m.id)} />
    </Card>
  );
}
