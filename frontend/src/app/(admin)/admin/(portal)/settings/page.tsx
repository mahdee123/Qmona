"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";
import { FieldGrid, type FieldDef, type Values } from "@/features/admin/fields";
import { errorMessage, useApi, useToast } from "@/features/admin/hooks";
import { RequireCap } from "@/features/admin/shell";
import { Btn, Card, ErrorBox, Loading, PageHeader } from "@/features/admin/ui";

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Identity",
    fields: [
      { name: "agency_name", label: "Agency name", type: "text", required: true },
      { name: "short_name", label: "Short name", type: "text", required: true },
      { name: "tagline", label: "Tagline", type: "text", wide: true },
      { name: "description", label: "Description (footer & structured data)", type: "textarea" },
      { name: "availability_label", label: "Hero status chip", type: "text", help: "e.g. “Open for new projects”. Leave empty to hide." },
      { name: "footer_note", label: "Footer note", type: "text" },
    ],
  },
  {
    title: "Contact details",
    fields: [
      { name: "email", label: "Email", type: "email" },
      { name: "support_email", label: "Support email", type: "email" },
      { name: "phone", label: "Phone", type: "text", placeholder: "+880 …" },
      { name: "whatsapp", label: "WhatsApp", type: "text" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "city", label: "City", type: "text" },
      { name: "country", label: "Country", type: "text" },
      { name: "office_hours", label: "Office hours", type: "text" },
      { name: "timezone_label", label: "Time zone label", type: "text" },
      { name: "privacy_notice", label: "Form privacy acknowledgement", type: "textarea", help: "The phrase “Privacy Policy” becomes a link." },
    ],
  },
  {
    title: "Branding",
    fields: [
      { name: "logo", label: "Logo (light backgrounds)", type: "media", detailKey: "logo_detail", help: "SVG or PNG. Empty = bundled Qmona logo." },
      { name: "logo_on_dark", label: "Logo (dark backgrounds)", type: "media", detailKey: "logo_on_dark_detail" },
      { name: "favicon", label: "Favicon", type: "media", detailKey: "favicon_detail", help: "PNG or SVG, square." },
      {
        name: "accent", label: "Accent colour", type: "select", required: true,
        options: [{ value: "red", label: "Signal Red (default)" }, { value: "orange", label: "Ember Orange" }, { value: "blue", label: "Electric Blue" }, { value: "violet", label: "Violet" }, { value: "green", label: "Emerald" }],
        help: "Approved palette only, so contrast stays accessible.",
      },
      { name: "animations_enabled", label: "Enable scroll & appear animations site-wide", type: "boolean", help: "Visitors with reduced-motion settings never see animations." },
    ],
  },
  {
    title: "Default SEO",
    fields: [
      { name: "default_meta_title", label: "Default SEO title", type: "text", maxLength: 160, wide: true },
      { name: "default_meta_description", label: "Default SEO description", type: "textarea", maxLength: 255 },
      { name: "og_image", label: "Default social sharing image", type: "media", detailKey: "og_image_detail", help: "1200×630 recommended." },
    ],
  },
];

function Settings() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Values>("/manage/site-profile/");
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setValues(data); }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const body = Object.fromEntries(GROUPS.flatMap((g) => g.fields).map((f) => [f.name, values[f.name] ?? (f.type === "boolean" ? false : f.type === "media" ? null : "")]));
    try {
      setValues(await api<Values>("/manage/site-profile/", { method: "PATCH", body }));
      toast("Settings saved. The website updates within moments.");
    } catch (err) {
      if (err instanceof ClientApiError) setErrors(err.fieldErrors());
      toast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={errorMessage(error)} onRetry={reload} />;
  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <PageHeader title="Site settings" description="Identity, contact details, branding tokens and SEO defaults. Credentials and infrastructure secrets are configured in environment variables, not here." actions={<Btn type="submit" variant="primary" loading={saving}><Save className="h-4 w-4" /> Save</Btn>} />
      {GROUPS.map((g) => (
        <Card key={g.title} title={g.title}>
          <FieldGrid fields={g.fields} values={values} setValue={(n, v) => setValues((s) => ({ ...s, [n]: v }))} errors={errors} />
        </Card>
      ))}
      <div className="flex justify-end"><Btn type="submit" variant="primary" loading={saving}><Save className="h-4 w-4" /> Save settings</Btn></div>
    </form>
  );
}

export default function SettingsPage() {
  return <RequireCap cap="manage_content"><Settings /></RequireCap>;
}
