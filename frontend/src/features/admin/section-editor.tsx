"use client";

import { ArrowDown, ArrowUp, ExternalLink, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";
import type { SectionStyle } from "@/lib/section-style";
import { cn } from "@/lib/utils";
import { FieldInput, type FieldDef, type Values } from "./fields";
import { errorMessage, listOf, useApi, useToast } from "./hooks";
import { MediaField } from "./media-picker";
import { StylePanel, type StyleSchema } from "./style-panel";
import { adminInput, Btn, Card, ConfirmDialog, Empty, ErrorBox, FormRow, Loading, Modal, PageHeader, SelectBox, StatusBadge, Toggle } from "./ui";

type Spec = { type: string; max_length?: number; min?: number; max?: number; max_items?: number; fields?: Record<string, Spec> };
interface Schemas {
  schemas: Record<string, { variants: string[]; fields: Record<string, Spec> }>;
  section_types: { value: string; label: string }[];
  animation_presets: { value: string; label: string }[];
  style_schema: StyleSchema;
}
interface Section {
  id: string; page: string; section_type: string; variant: string; label: string; headline: string; subheadline: string;
  content_data: Values; order: number; is_active: boolean; animation_enabled: boolean; animation_preset: string;
  animation_duration: string; animation_delay: string; style?: SectionStyle;
}
interface Page { id: string; slug: string; title: string; meta_title: string; meta_description: string; is_published: boolean; og_image: string | null }

const HELP: Record<string, string> = {
  hero: "Main homepage introduction.", featured_project: "Large project panel. Uses the chosen slug or the first featured published project; hidden if none.",
  impact: "Credibility cards from Admin → Credibility (claims need verification).", services: "Accordion of homepage services.",
  projects: "Grid of published projects; hidden if none.", process: "Steps from Admin → Process steps.",
  pricing: "Hidden until a plan is published.", testimonials: "Hidden until a verified testimonial is published.",
  faq: "FAQs marked “Show on homepage”.", contact: "Contact details + inquiry form.", blog: "Latest published articles; hidden if none.",
  cta_banner: "Call-to-action banner.", page_hero: "Page heading.", team: "Hidden until team members are published.",
};

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function ContentField({ name, spec, value, onChange }: { name: string; spec: Spec; value: unknown; onChange: (v: unknown) => void }) {
  const id = `content-${name}`;
  const label = humanize(name);
  if (spec.type === "link") {
    const link = (value as { label?: string; url?: string }) || {};
    return (
      <FormRow id={`${id}-label`} label={`${label} (label + link)`} className="tablet:col-span-2">
        <div className="grid gap-2 tablet:grid-cols-2">
          <input id={`${id}-label`} placeholder="Button label" value={link.label || ""} onChange={(e) => onChange({ ...link, label: e.target.value })} className={cn(adminInput, "h-10")} />
          <input aria-label={`${label} URL`} placeholder="/contact or https://…" value={link.url || ""} onChange={(e) => onChange({ ...link, url: e.target.value })} className={cn(adminInput, "h-10")} />
        </div>
      </FormRow>
    );
  }
  if (spec.type === "media") {
    return (
      <FormRow id={id} label={label} className="tablet:col-span-2">
        <MediaField id={id} value={(value as string) || null} onChange={(v) => onChange(v)} />
      </FormRow>
    );
  }
  if (spec.type === "media_list") {
    const ids = (value as string[]) || [];
    return (
      <FormRow id={id} label={`${label} (up to ${spec.max_items})`} className="tablet:col-span-2">
        <div className="space-y-2">
          {ids.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <MediaField id={`${id}-${i}`} value={m} onChange={(v) => onChange(v ? ids.map((x, j) => (j === i ? v : x)) : ids.filter((_, j) => j !== i))} />
            </div>
          ))}
          {ids.length < (spec.max_items || 3) && <MediaField id={`${id}-new`} value={null} onChange={(v) => v && onChange([...ids, v])} />}
        </div>
      </FormRow>
    );
  }
  const map: Record<string, FieldDef["type"]> = { str: "text", text: "textarea", bool: "boolean", int: "number", url: "text", icon: "icon", slug: "text", str_list: "string-list", obj_list: "obj-list" };
  const field: FieldDef = {
    name: id, label, type: map[spec.type] || "text", maxLength: spec.max_length,
    help: spec.type === "int" ? `${spec.min}–${spec.max}` : spec.type === "slug" ? "Project slug (leave empty for automatic)." : undefined,
    fields: spec.fields ? Object.entries(spec.fields).map(([k, s]) => ({ name: k, label: humanize(k), type: s.type === "text" ? "textarea" : "text" })) : undefined,
  };
  const values = { [id]: spec.type === "int" && value !== undefined && value !== null ? String(value) : value };
  const set = (_: string, v: unknown) => onChange(spec.type === "int" ? (v === null || v === "" ? undefined : Number(v)) : v);
  if (field.type === "boolean") return <div className="tablet:col-span-2"><FieldInput field={field} values={values} setValue={set} /></div>;
  return (
    <FormRow id={id} label={label} help={field.help} className={cn(["textarea", "string-list", "obj-list"].includes(field.type) && "tablet:col-span-2")}>
      <FieldInput field={field} values={values} setValue={set} />
    </FormRow>
  );
}

function SectionForm({ section, schemas, onSaved, onClose }: { section: Section; schemas: Schemas; onSaved: (s: Section) => void; onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<Section>(section);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const schema = schemas.schemas[v.section_type];
  const set = <K extends keyof Section>(k: K, val: Section[K]) => setV((s) => ({ ...s, [k]: val }));

  async function save() {
    setSaving(true);
    setErrors({});
    setMsg(null);
    const content = Object.fromEntries(Object.entries(v.content_data || {}).filter(([, x]) => x !== undefined && x !== "" && !(typeof x === "object" && x !== null && !Array.isArray(x) && !(x as { label?: string }).label && !(x as { url?: string }).url)));
    try {
      const body = { ...v, content_data: content };
      const saved = await api<Section>(section.id ? `/manage/sections/${section.id}/` : "/manage/sections/", { method: section.id ? "PATCH" : "POST", body: body as unknown as Values });
      toast("Section saved.");
      onSaved(saved);
    } catch (e) {
      if (e instanceof ClientApiError) {
        setErrors(e.fieldErrors());
        setMsg(e.message + (e.body.errors?.content_data ? ` ${JSON.stringify(e.body.errors.content_data)}` : ""));
      } else setMsg(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`${section.id ? "Edit" : "Add"} section — ${schemas.section_types.find((t) => t.value === v.section_type)?.label}`} wide footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" loading={saving} onClick={save}>Save section</Btn></>}>
      <div className="space-y-6">
        {HELP[v.section_type] && <p className="text-[0.8125rem] text-muted">{HELP[v.section_type]}</p>}
        {msg && <ErrorBox message={msg} />}
        <div className="grid gap-4 tablet:grid-cols-2">
          <FormRow id="s-variant" label="Layout variant" error={errors.variant}>
            <SelectBox id="s-variant" value={v.variant} onChange={(x) => set("variant", x)} options={(schema?.variants || []).map((x) => ({ value: x, label: humanize(x) }))} />
          </FormRow>
          <FormRow id="s-label" label="Small label" help="Shown with a red square above the heading." error={errors.label}>
            <input id="s-label" value={v.label} maxLength={60} onChange={(e) => set("label", e.target.value)} className={cn(adminInput, "h-10")} />
          </FormRow>
          <FormRow id="s-headline" label="Headline" help="Press Enter to start the second line." error={errors.headline} className="tablet:col-span-2">
            <textarea id="s-headline" rows={2} value={v.headline} maxLength={255} onChange={(e) => set("headline", e.target.value)} className={cn(adminInput, "py-2 text-[1.0625rem] font-medium")} />
          </FormRow>
          <FormRow id="s-sub" label="Sub-headline" error={errors.subheadline} className="tablet:col-span-2">
            <textarea id="s-sub" rows={2} value={v.subheadline} onChange={(e) => set("subheadline", e.target.value)} className={cn(adminInput, "py-2")} />
          </FormRow>
        </div>
        {schema && Object.keys(schema.fields).length > 0 && (
          <fieldset className="space-y-3 rounded-[16px] border border-line p-4">
            <legend className="px-1 text-[0.8125rem] font-bold">Section content</legend>
            <div className="grid gap-4 tablet:grid-cols-2">
              {Object.entries(schema.fields).map(([k, spec]) => (
                <ContentField key={k} name={k} spec={spec} value={v.content_data?.[k]} onChange={(val) => set("content_data", { ...(v.content_data || {}), [k]: val })} />
              ))}
            </div>
          </fieldset>
        )}
        <StylePanel sectionType={v.section_type} schema={schemas.style_schema} value={v.style || {}} onChange={(x) => set("style", x)} errors={errors.style} />
        <fieldset className="space-y-4 rounded-[16px] border border-line p-4">
          <legend className="px-1 text-[0.8125rem] font-bold">Motion</legend>
          <Toggle id="s-anim" checked={v.animation_enabled} onChange={(x) => set("animation_enabled", x)} label="Animate when scrolled into view" description="Visitors who prefer reduced motion always see static content." />
          <div className="grid gap-4 tablet:grid-cols-3">
            <FormRow id="s-preset" label="Preset">
              <SelectBox id="s-preset" value={v.animation_preset} onChange={(x) => set("animation_preset", x)} options={schemas.animation_presets} />
            </FormRow>
            <FormRow id="s-dur" label={`Duration: ${Number(v.animation_duration).toFixed(2)}s`} error={errors.animation_duration}>
              <input id="s-dur" type="range" min={0.2} max={1.2} step={0.05} value={v.animation_duration} onChange={(e) => set("animation_duration", e.target.value)} />
            </FormRow>
            <FormRow id="s-delay" label={`Delay: ${Number(v.animation_delay).toFixed(2)}s`} error={errors.animation_delay}>
              <input id="s-delay" type="range" min={0} max={1.5} step={0.05} value={v.animation_delay} onChange={(e) => set("animation_delay", e.target.value)} />
            </FormRow>
          </div>
        </fieldset>
        <Toggle id="s-active" checked={v.is_active} onChange={(x) => set("is_active", x)} label="Visible on the page" />
      </div>
    </Modal>
  );
}

export function PageSectionsEditor({ slug }: { slug: string }) {
  const toast = useToast();
  const { data: page, setData: setPage, error: pageError, reload: reloadPage } = useApi<Page>(`/manage/pages/${slug}/`);
  const { data: schemas } = useApi<Schemas>("/manage/section-schemas/");
  const { data, loading, error, reload, setData } = useApi<Section[]>(`/manage/sections/?page_slug=${slug}`);
  const sections = listOf(data);
  const [editing, setEditing] = useState<Section | null>(null);
  const [adding, setAdding] = useState("");
  const [confirm, setConfirm] = useState<Section | null>(null);
  const [seo, setSeo] = useState<Partial<Page>>({});
  useEffect(() => { if (page) setSeo(page); }, [page]);

  const livePath = slug === "home" ? "/" : `/${slug}`;

  async function move(i: number, d: -1 | 1) {
    const next = [...sections];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    setData(next);
    try { await api("/manage/sections/reorder/", { method: "POST", body: { ids: next.map((s) => s.id) } }); toast("Order saved."); }
    catch (e) { toast(errorMessage(e), "error"); reload(); }
  }
  async function toggle(s: Section) {
    setData(sections.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
    try { await api(`/manage/sections/${s.id}/`, { method: "PATCH", body: { is_active: !s.is_active } }); toast(!s.is_active ? "Section shown." : "Section hidden."); }
    catch (e) { toast(errorMessage(e), "error"); reload(); }
  }
  async function remove() {
    if (!confirm) return;
    try { await api(`/manage/sections/${confirm.id}/`, { method: "DELETE" }); toast("Section deleted."); setConfirm(null); reload(); }
    catch (e) { toast(errorMessage(e), "error"); }
  }
  async function saveSeo() {
    try {
      const res = await api<Page>(`/manage/pages/${slug}/`, { method: "PATCH", body: { title: seo.title, meta_title: seo.meta_title, meta_description: seo.meta_description, is_published: seo.is_published } });
      setPage(res);
      toast("Page settings saved.");
    } catch (e) { toast(errorMessage(e), "error"); }
  }

  if (pageError) return <ErrorBox message={errorMessage(pageError)} onRetry={reloadPage} />;
  if (!page || !schemas) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/pages", label: "Pages" }}
        title={page.title}
        description={`Sections render top to bottom in this order. Section types and variants are fixed so the design stays consistent.`}
        actions={<>
          <Btn href={`/preview/page/${slug}`}><Eye className="h-4 w-4" /> Preview</Btn>
          <a href={livePath} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-[0.875rem] font-medium"><ExternalLink className="h-4 w-4" /> View live</a>
        </>}
      />

      <Card title="Sections">
        {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
        {loading && !data ? <Loading /> : sections.length === 0 ? <Empty>No sections yet.</Empty> : (
          <ol className="space-y-2">
            {sections.map((s, i) => (
              <li key={s.id} className={cn("flex flex-wrap items-center gap-3 rounded-[14px] border border-line p-3", !s.is_active && "opacity-60")}>
                <div className="flex">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-page disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-page disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[0.75rem] uppercase tracking-wide text-muted">
                    {schemas.section_types.find((t) => t.value === s.section_type)?.label}
                    <StatusBadge value={s.variant} tone="gray" />
                    {!s.animation_enabled && <StatusBadge value="no motion" tone="gray" />}
                  </p>
                  <p className="truncate font-medium">{s.headline.replace(/\n/g, " ") || <span className="text-muted">(no headline)</span>}</p>
                </div>
                <Toggle id={`sec-${s.id}`} checked={s.is_active} onChange={() => toggle(s)} label={`Visible: ${s.headline || s.section_type}`} hideLabel />
                <Btn variant="ghost" aria-label="Edit section" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /> Edit</Btn>
                <Btn variant="ghost" aria-label="Delete section" onClick={() => setConfirm(s)}><Trash2 className="h-4 w-4" /></Btn>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <FormRow id="add-type" label="Add a section" className="w-64">
            <SelectBox id="add-type" value={adding} onChange={setAdding} placeholder="Choose type…" options={schemas.section_types} />
          </FormRow>
          <Btn disabled={!adding} onClick={() => {
            const variants = schemas.schemas[adding]?.variants || ["default"];
            setEditing({ id: "", page: page.id, section_type: adding, variant: variants[0], label: "", headline: "", subheadline: "", content_data: {}, order: sections.length, is_active: true, animation_enabled: true, animation_preset: "fade_up", animation_duration: "0.60", animation_delay: "0.00" });
            setAdding("");
          }}><Plus className="h-4 w-4" /> Add</Btn>
        </div>
      </Card>

      <Card title="Page settings & SEO">
        <div className="grid gap-4 tablet:grid-cols-2">
          <FormRow id="p-title" label="Page title"><input id="p-title" value={seo.title || ""} onChange={(e) => setSeo({ ...seo, title: e.target.value })} className={cn(adminInput, "h-10")} /></FormRow>
          <FormRow id="p-meta-title" label="SEO title"><input id="p-meta-title" maxLength={160} value={seo.meta_title || ""} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} className={cn(adminInput, "h-10")} /></FormRow>
          <FormRow id="p-meta-desc" label="SEO description" className="tablet:col-span-2"><textarea id="p-meta-desc" maxLength={255} rows={2} value={seo.meta_description || ""} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} className={cn(adminInput, "py-2")} /></FormRow>
          <Toggle id="p-published" checked={!!seo.is_published} onChange={(x) => setSeo({ ...seo, is_published: x })} label="Page published" description={slug === "home" ? "The homepage should stay published." : "Unpublished CMS pages fall back to built-in headings."} />
        </div>
        <div className="mt-4 flex justify-end"><Btn variant="primary" onClick={saveSeo}>Save page settings</Btn></div>
      </Card>

      {editing && (
        <SectionForm
          section={editing}
          schemas={schemas}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
      <ConfirmDialog open={!!confirm} title="Delete section?" message="The section is removed from the page. You can hide sections instead of deleting them." onCancel={() => setConfirm(null)} onConfirm={remove} />
    </div>
  );
}
