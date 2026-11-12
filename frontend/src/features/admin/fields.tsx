"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Media } from "@/types";
import { Icon, ICON_KEYS } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { listOf, useApi } from "./hooks";
import { MediaField, MediaPickerModal, Thumb, toMedia } from "./media-picker";
import { adminInput, Btn, FormRow, SelectBox, Toggle } from "./ui";
import { useState } from "react";

export type FieldType =
  | "text" | "textarea" | "slug" | "number" | "decimal" | "boolean" | "select" | "icon" | "url" | "email"
  | "media" | "ref" | "multi-ref" | "string-list" | "obj-list" | "blocks" | "date" | "datetime";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
  /** For ref / multi-ref: endpoint returning a list, and how to label items. */
  ref?: { endpoint: string; label: string; value?: string };
  /** For obj-list: nested fields (text / textarea only). */
  fields?: { name: string; label: string; type: "text" | "textarea" }[];
  /** For slug: source field to auto-generate from. */
  from?: string;
  /** Read-only media detail key (e.g. "cover_image_detail"). */
  detailKey?: string;
  wide?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export type Values = Record<string, unknown>;

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}

function StringList({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const items = value || [];
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-2" id={id}>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input aria-label={`Item ${i + 1}`} value={item} onChange={(e) => set(i, e.target.value)} className={cn(adminInput, "h-10")} />
          <Btn variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Btn>
          <Btn variant="ghost" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Btn>
          <Btn variant="ghost" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Btn>
        </div>
      ))}
      <Btn onClick={() => onChange([...items, ""])}><Plus className="h-4 w-4" /> Add item</Btn>
    </div>
  );
}

function ObjList({ id, value, onChange, fields }: { id: string; value: Values[]; onChange: (v: Values[]) => void; fields: NonNullable<FieldDef["fields"]> }) {
  const items = value || [];
  const set = (i: number, k: string, v: string) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="space-y-3" id={id}>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-[14px] border border-line bg-page/60 p-3">
          {fields.map((f) =>
            f.type === "textarea" ? (
              <textarea key={f.name} aria-label={`${f.label} ${i + 1}`} placeholder={f.label} value={String(item[f.name] ?? "")} onChange={(e) => set(i, f.name, e.target.value)} rows={3} className={cn(adminInput, "py-2")} />
            ) : (
              <input key={f.name} aria-label={`${f.label} ${i + 1}`} placeholder={f.label} value={String(item[f.name] ?? "")} onChange={(e) => set(i, f.name, e.target.value)} className={cn(adminInput, "h-10")} />
            ),
          )}
          <div className="flex justify-end gap-1">
            <Btn variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}><ArrowUp className="h-4 w-4" /></Btn>
            <Btn variant="ghost" aria-label="Move down" disabled={i === items.length - 1} onClick={() => { const n = [...items]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; onChange(n); }}><ArrowDown className="h-4 w-4" /></Btn>
            <Btn variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /> Remove</Btn>
          </div>
        </div>
      ))}
      <Btn onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f.name, ""]))])}><Plus className="h-4 w-4" /> Add</Btn>
    </div>
  );
}

type Block = Values & { type: string };
const BLOCK_TYPES = [
  { value: "paragraph", label: "Paragraph" }, { value: "heading", label: "Heading" }, { value: "list", label: "List" },
  { value: "quote", label: "Quote" }, { value: "callout", label: "Callout" }, { value: "image", label: "Image" }, { value: "divider", label: "Divider" },
];

/** Structured content editor (no raw HTML). Inline: **bold**, [label](https://url). */
export function BlocksEditor({ id, value, onChange }: { id: string; value: Block[]; onChange: (v: Block[]) => void }) {
  const blocks = value || [];
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const set = (i: number, patch: Values) => onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const add = (type: string) => {
    const base: Block = { type };
    if (type === "heading") Object.assign(base, { level: 2, text: "" });
    if (type === "paragraph" || type === "quote" || type === "callout") base.text = "";
    if (type === "list") Object.assign(base, { style: "unordered", items: [""] });
    onChange([...blocks, base]);
    if (type === "image") setPickerFor(blocks.length);
  };
  return (
    <div id={id} className="space-y-3">
      <p className="text-[0.75rem] text-muted">Formatting: <code>**bold**</code> and <code>[link text](https://example.com)</code> or <code>[link](/contact)</code>. HTML is not allowed.</p>
      {blocks.map((b, i) => (
        <div key={i} className="rounded-[14px] border border-line bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[0.75rem] font-bold uppercase tracking-wide text-muted">{b.type}</span>
            <div className="flex gap-1">
              <Btn variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...blocks]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}><ArrowUp className="h-4 w-4" /></Btn>
              <Btn variant="ghost" aria-label="Move down" disabled={i === blocks.length - 1} onClick={() => { const n = [...blocks]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; onChange(n); }}><ArrowDown className="h-4 w-4" /></Btn>
              <Btn variant="ghost" aria-label="Delete block" onClick={() => onChange(blocks.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Btn>
            </div>
          </div>
          {b.type === "heading" && (
            <div className="flex gap-2">
              <div className="w-28"><SelectBox id={`${id}-${i}-lvl`} value={String(b.level || 2)} onChange={(v) => set(i, { level: Number(v) })} options={[{ value: "2", label: "H2" }, { value: "3", label: "H3" }, { value: "4", label: "H4" }]} /></div>
              <input aria-label="Heading text" value={String(b.text || "")} onChange={(e) => set(i, { text: e.target.value })} className={cn(adminInput, "h-10 font-medium")} />
            </div>
          )}
          {["paragraph", "quote", "callout"].includes(b.type) && (
            <textarea aria-label={`${b.type} text`} value={String(b.text || "")} onChange={(e) => set(i, { text: e.target.value })} rows={b.type === "paragraph" ? 4 : 2} className={cn(adminInput, "py-2")} />
          )}
          {b.type === "quote" && <input aria-label="Citation" placeholder="Citation (optional)" value={String(b.cite || "")} onChange={(e) => set(i, { cite: e.target.value })} className={cn(adminInput, "mt-2 h-10")} />}
          {b.type === "list" && (
            <div className="space-y-2">
              <div className="w-40"><SelectBox id={`${id}-${i}-style`} value={String(b.style || "unordered")} onChange={(v) => set(i, { style: v })} options={[{ value: "unordered", label: "Bulleted" }, { value: "ordered", label: "Numbered" }]} /></div>
              <StringList id={`${id}-${i}-items`} value={(b.items as string[]) || []} onChange={(v) => set(i, { items: v })} />
            </div>
          )}
          {b.type === "image" && (
            <div className="flex flex-wrap items-start gap-3">
              <Thumb media={(b._preview as Media) || (b.url ? { url: String(b.url) } : null)} className="h-20 w-28" />
              <div className="flex-1 space-y-2">
                <Btn onClick={() => setPickerFor(i)}>{b.media_id ? "Replace image" : "Choose image"}</Btn>
                <input aria-label="Alt text" placeholder="Alt text (describe the image)" value={String(b.alt || "")} onChange={(e) => set(i, { alt: e.target.value })} className={cn(adminInput, "h-10")} />
                <input aria-label="Caption" placeholder="Caption (optional)" value={String(b.caption || "")} onChange={(e) => set(i, { caption: e.target.value })} className={cn(adminInput, "h-10")} />
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((t) => <Btn key={t.value} onClick={() => add(t.value)}><Plus className="h-4 w-4" /> {t.label}</Btn>)}
      </div>
      <MediaPickerModal
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onPick={(m) => { if (pickerFor !== null) set(pickerFor, { media_id: m.id, alt: m.alt_text || "", _preview: toMedia(m) }); }}
      />
    </div>
  );
}

/** Strip client-only keys before sending blocks to the API. */
export function cleanBlocks(blocks: Block[]) {
  return (blocks || []).map((b) => {
    const { _preview, url, width, height, ...rest } = b as Values; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  });
}

function RefSelect({ field, value, onChange, multi, invalid }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; multi?: boolean; invalid?: boolean }) {
  const { data } = useApi<Values[] | { results: Values[] }>(field.ref!.endpoint);
  const items = listOf(data);
  const vk = field.ref!.value || "id";
  const options = items.map((it) => ({ value: String(it[vk]), label: String(it[field.ref!.label]) }));
  if (!multi) {
    return <SelectBox id={field.name} value={value ? String(value) : ""} onChange={(v) => onChange(v || null)} options={options} placeholder="— None —" invalid={invalid} />;
  }
  const selected = new Set(((value as string[]) || []).map(String));
  return (
    <div id={field.name} className="flex flex-wrap gap-2 rounded-[12px] border border-line bg-card p-2" role="group" aria-label={field.label}>
      {options.length === 0 && <span className="px-2 py-1 text-[0.8125rem] text-muted">No options yet.</span>}
      {options.map((o) => {
        const on = selected.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => {
              const n = new Set(selected);
              if (on) n.delete(o.value);
              else n.add(o.value);
              onChange(Array.from(n));
            }}
            className={cn("rounded-full px-3 py-1.5 text-[0.8125rem] transition", on ? "bg-ink text-white" : "bg-page text-body hover:text-ink")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function FieldInput({ field, values, setValue, error }: { field: FieldDef; values: Values; setValue: (name: string, v: unknown) => void; error?: string }) {
  const v = values[field.name];
  const common = { id: field.name, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${field.name}-error` : field.help ? `${field.name}-help` : undefined };
  switch (field.type) {
    case "textarea":
      return <textarea {...common} value={String(v ?? "")} onChange={(e) => setValue(field.name, e.target.value)} rows={5} maxLength={field.maxLength} placeholder={field.placeholder} className={cn(adminInput, "py-2.5")} />;
    case "boolean":
      return <Toggle id={field.name} checked={!!v} onChange={(c) => setValue(field.name, c)} label={field.label} description={field.help} />;
    case "select":
      return <SelectBox id={field.name} value={String(v ?? "")} onChange={(x) => setValue(field.name, x)} options={field.options || []} invalid={!!error} placeholder={field.required ? undefined : "— None —"} />;
    case "icon":
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-white"><Icon name={String(v || "")} className="h-4 w-4" /></span>
          <SelectBox id={field.name} value={String(v ?? "")} onChange={(x) => setValue(field.name, x)} options={ICON_KEYS.map((k) => ({ value: k, label: k }))} placeholder={field.required ? undefined : "— None —"} />
        </div>
      );
    case "number":
    case "decimal":
      return <input {...common} type="number" step={field.type === "decimal" ? "0.01" : "1"} value={v === null || v === undefined ? "" : String(v)} onChange={(e) => setValue(field.name, e.target.value === "" ? null : e.target.value)} className={cn(adminInput, "h-10")} />;
    case "media":
      return <MediaField id={field.name} value={(v as string) || null} detail={field.detailKey ? (values[field.detailKey] as Media) : null} onChange={(id) => setValue(field.name, id)} />;
    case "ref":
      return <RefSelect field={field} value={v} onChange={(x) => setValue(field.name, x)} invalid={!!error} />;
    case "multi-ref":
      return <RefSelect field={field} value={v} onChange={(x) => setValue(field.name, x)} multi />;
    case "string-list":
      return <StringList id={field.name} value={(v as string[]) || []} onChange={(x) => setValue(field.name, x)} />;
    case "obj-list":
      return <ObjList id={field.name} value={(v as Values[]) || []} onChange={(x) => setValue(field.name, x)} fields={field.fields || []} />;
    case "blocks":
      return <BlocksEditor id={field.name} value={(v as Block[]) || []} onChange={(x) => setValue(field.name, x)} />;
    case "date":
      return <input {...common} type="date" value={String(v ?? "")} onChange={(e) => setValue(field.name, e.target.value || null)} className={cn(adminInput, "h-10")} />;
    case "datetime": {
      const local = v ? new Date(String(v)).toISOString().slice(0, 16) : "";
      return <input {...common} type="datetime-local" value={local} onChange={(e) => setValue(field.name, e.target.value ? new Date(e.target.value).toISOString() : null)} className={cn(adminInput, "h-10")} />;
    }
    default:
      return (
        <input
          {...common}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          value={String(v ?? "")}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => setValue(field.name, field.type === "slug" ? e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") : e.target.value)}
          className={cn(adminInput, "h-10", field.type === "slug" && "font-mono text-[0.875rem]")}
        />
      );
  }
}

export function FieldGrid({ fields, values, setValue, errors }: { fields: FieldDef[]; values: Values; setValue: (n: string, v: unknown) => void; errors: Record<string, string> }) {
  return (
    <div className="grid gap-5 tablet:grid-cols-2">
      {fields.map((f) =>
        f.type === "boolean" ? (
          <div key={f.name} className={cn(f.wide && "tablet:col-span-2")}>
            <FieldInput field={f} values={values} setValue={setValue} error={errors[f.name]} />
            {errors[f.name] && <p className="mt-1 text-[0.75rem] font-medium text-danger">{errors[f.name]}</p>}
          </div>
        ) : (
          <FormRow
            key={f.name}
            id={f.name}
            label={f.label}
            required={f.required}
            help={f.help}
            error={errors[f.name]}
            className={cn((f.wide || ["textarea", "blocks", "obj-list", "string-list", "multi-ref", "media"].includes(f.type)) && "tablet:col-span-2")}
          >
            <FieldInput field={f} values={values} setValue={setValue} error={errors[f.name]} />
          </FormRow>
        ),
      )}
    </div>
  );
}
