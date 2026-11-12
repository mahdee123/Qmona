"use client";

import { useRouter } from "next/navigation";
import { Eye, ExternalLink, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ClientApiError } from "@/lib/client-api";
import { cleanBlocks, FieldGrid, slugify, type Values } from "./fields";
import { errorMessage, useApi, useToast } from "./hooks";
import type { ResourceConfig } from "./resources";
import { Btn, Card, ConfirmDialog, ErrorBox, Loading, PageHeader } from "./ui";

export function ResourceEditor({
  config,
  basePath,
  id,
  children,
}: {
  config: ResourceConfig;
  basePath: string;
  id: string;
  /** Extra panels rendered for existing items (e.g. project gallery). */
  children?: (item: Values, reload: () => void) => ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const isNew = id === "new";
  const { data, loading, error, reload } = useApi<Values>(isNew ? null : `${config.endpoint}${id}/`);
  const [values, setValues] = useState<Values>(() => ({ ...(config.defaults || {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const slugTouched = useRef(!isNew);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) {
      setValues(config.transformIn ? config.transformIn(data) : data);
      setDirty(false);
    }
  }, [data, config]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const setValue = (name: string, v: unknown) => {
    setDirty(true);
    setValues((s) => {
      const next = { ...s, [name]: v };
      const slugField = config.fields.find((f) => f.type === "slug" && f.from === name);
      if (slugField && !slugTouched.current) next[slugField.name] = slugify(String(v || ""));
      if (config.fields.some((f) => f.type === "slug" && f.name === name)) slugTouched.current = true;
      return next;
    });
  };

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFormError(null);
    let payload: Values = {};
    for (const f of config.fields) {
      let v = values[f.name];
      if (f.type === "blocks") v = cleanBlocks((v as never) || []);
      if ((f.type === "number" || f.type === "decimal") && (v === "" || v === undefined)) v = null;
      if (f.type === "string-list") v = ((v as string[]) || []).map((s) => s.trim()).filter(Boolean);
      // Empty whole-number fields (e.g. order) are omitted so the backend default applies.
      if (f.type === "number" && v === null) continue;
      payload[f.name] = v === undefined ? (f.type === "boolean" ? false : f.type === "text" || f.type === "textarea" || f.type === "slug" || f.type === "url" ? "" : null) : v;
    }
    if (config.transformOut) payload = config.transformOut(payload);
    try {
      const saved = await api<Values>(isNew ? config.endpoint : `${config.endpoint}${id}/`, { method: isNew ? "POST" : "PATCH", body: payload });
      setDirty(false);
      toast(`${config.singular} saved.`);
      if (isNew) router.replace(`${basePath}/${saved.id}`);
      else setValues(config.transformIn ? config.transformIn(saved) : saved);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setErrors(err.fieldErrors());
        setFormError(err.message);
      } else setFormError(errorMessage(err));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`${config.endpoint}${id}/`, { method: "DELETE" });
      toast(`${config.singular} deleted.`);
      router.replace(basePath);
    } catch (err) {
      toast(errorMessage(err), "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!isNew && loading && !data) return <Loading />;
  if (!isNew && error) return <ErrorBox message={errorMessage(error)} onRetry={reload} />;

  const title = isNew ? `New ${config.singular.toLowerCase()}` : String(values.title || values.name || values.label || values.question || values.full_name || values.client_name || config.singular);
  const publicUrl = !isNew ? config.publicUrl?.(values) : null;
  const previewUrl = !isNew ? config.previewUrl?.(values) : null;
  const unknownErrors = Object.keys(errors).filter((k) => !config.fields.some((f) => f.name === k));

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={title}
        back={{ href: basePath, label: config.title }}
        actions={
          <>
            {previewUrl && <Btn href={previewUrl}><Eye className="h-4 w-4" /> Preview</Btn>}
            {publicUrl && <a href={publicUrl} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-[0.875rem] font-medium"><ExternalLink className="h-4 w-4" /> View live</a>}
            {!isNew && <Btn variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Delete</Btn>}
            <Btn type="submit" variant="primary" loading={saving}><Save className="h-4 w-4" /> Save</Btn>
          </>
        }
      />
      {config.note && <p className="mb-5 rounded-[14px] border border-warning/30 bg-warning/5 px-4 py-3 text-[0.875rem] text-ink">{config.note}</p>}
      {formError && (
        <div ref={errorRef} tabIndex={-1} className="mb-5 outline-none">
          <ErrorBox message={unknownErrors.length ? `${formError} ${unknownErrors.map((k) => `${k}: ${errors[k]}`).join(" ")}` : formError} />
        </div>
      )}
      <Card>
        <FieldGrid fields={config.fields} values={values} setValue={setValue} errors={errors} />
      </Card>
      {!isNew && children && values.id ? <div className="mt-6 space-y-6">{children(values, reload)}</div> : null}
      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Btn type="submit" variant="primary" loading={saving} className="shadow-lg"><Save className="h-4 w-4" /> {dirty ? "Save changes" : "Save"}</Btn>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${config.singular.toLowerCase()}?`}
        message={<>This permanently deletes <strong className="text-ink">{title}</strong>.</>}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={deleting}
      />
    </form>
  );
}
