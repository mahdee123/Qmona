"use client";

import { useState } from "react";
import type { FormOptions } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, ErrorSummary, Field, Honeypot, PhoneInput, PrivacyText, Select, TextArea, TextInput } from "./fields";
import { SuccessPanel } from "./success-panel";
import { EMAIL_RE, useInquirySubmit } from "./use-submit";

export interface ContactInitial {
  service?: string;
  industry?: string;
  product_type?: string;
  project?: string;
  projectTitle?: string;
  topic?: string;
}

const LABELS: Record<string, string> = {
  full_name: "Full name", email: "Email", company: "Company", phone: "Phone", phone_country_code: "Country code",
  topic: "Inquiry topic", service: "Service", industry: "Industry", product_type: "Product type", budget: "Budget",
  timeline: "Timeline", contact_method: "Preferred contact method", message: "Project description",
  privacy_acknowledged: "Privacy",
};

export function ContactForm({
  options,
  initial = {},
  privacyNotice,
  source = "/contact",
}: {
  options: FormOptions;
  initial?: ContactInitial;
  privacyNotice?: string;
  source?: string;
}) {
  const blank = {
    full_name: "", email: "", company: "", phone_country_code: "+880", phone: "",
    topic: initial.topic || "", service: initial.service || "", industry: initial.industry || "",
    product_type: initial.product_type || "", budget: "", timeline: "", contact_method: "", message: "",
    privacy_acknowledged: false, hp_website: "",
  };
  const [v, setV] = useState(blank);
  const { submitting, errors, message, result, setResult, submit, summaryRef } = useInquirySubmit();
  const set = <K extends keyof typeof v>(k: K) => (val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  function validate() {
    const e: Record<string, string> = {};
    if (v.full_name.trim().length < 2) e.full_name = "Enter your full name.";
    if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
    if (!v.topic) e.topic = "Choose what your inquiry is about.";
    if (v.message.trim().length < 10) e.message = "Tell us a little more (at least 10 characters).";
    if (v.phone && !/^[0-9 ()-]{5,20}$/.test(v.phone.trim())) e.phone = "Use digits only (spaces and dashes are fine).";
    if (!v.privacy_acknowledged) e.privacy_acknowledged = "Please confirm you have read the privacy notice.";
    return e;
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    submit(
      {
        inquiry_type: "contact",
        ...v,
        phone_country_code: v.phone ? v.phone_country_code : "",
        project: initial.project || "",
        source_page: source,
      },
      validate(),
    );
  }

  if (result) {
    return <SuccessPanel kind="contact" result={result} onReset={() => { setResult(null); setV(blank); }} />;
  }

  const o = options.options;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-6 rounded-[28px] bg-card p-5 shadow-[var(--shadow-card)] tablet:p-7" aria-describedby="contact-form-note">
      <Honeypot value={v.hp_website} onChange={set("hp_website")} />
      <ErrorSummary errors={errors} labels={LABELS} summaryRef={summaryRef} message={message} />

      {initial.projectTitle && (
        <p className="rounded-[18px] bg-page px-4 py-3 text-[0.875rem] text-body">
          Inquiring about <strong className="font-medium text-ink">{initial.projectTitle}</strong>
        </p>
      )}

      <div className="grid gap-5 tablet:grid-cols-2">
        <Field id="full_name" label="Full name" required error={errors.full_name}>
          <TextInput id="full_name" value={v.full_name} onChange={set("full_name")} error={errors.full_name} autoComplete="name" required maxLength={150} disabled={submitting} placeholder="Jane Smith" />
        </Field>
        <Field id="email" label="Email" required error={errors.email}>
          <TextInput id="email" type="email" value={v.email} onChange={set("email")} error={errors.email} autoComplete="email" required maxLength={254} disabled={submitting} placeholder="jane@company.com" inputMode="email" />
        </Field>
        <Field id="company" label="Company" error={errors.company}>
          <TextInput id="company" value={v.company} onChange={set("company")} error={errors.company} autoComplete="organization" maxLength={150} disabled={submitting} />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone || errors.phone_country_code}>
          <PhoneInput codeValue={v.phone_country_code} onCodeChange={set("phone_country_code")} value={v.phone} onChange={set("phone")} error={errors.phone} codeError={errors.phone_country_code} disabled={submitting} />
        </Field>
      </div>

      <div className="dash-x" aria-hidden="true" />

      <div className="grid gap-5 tablet:grid-cols-2">
        <Field id="topic" label="Inquiry topic" required error={errors.topic} className="tablet:col-span-2">
          <Select id="topic" value={v.topic} onChange={set("topic")} options={o.inquiry_topic} error={errors.topic} required disabled={submitting} placeholder="What can we help with?" />
        </Field>
        <Field id="service" label="Service" error={errors.service}>
          <Select id="service" value={v.service} onChange={set("service")} options={options.services.map((s) => ({ value: s.slug, label: s.title }))} includeOpen error={errors.service} disabled={submitting} />
        </Field>
        <Field id="product_type" label="Product type" error={errors.product_type}>
          <Select id="product_type" value={v.product_type} onChange={set("product_type")} options={options.product_types.map((p) => ({ value: p.slug, label: p.name }))} includeOpen error={errors.product_type} disabled={submitting} />
        </Field>
        <Field id="industry" label="Industry" error={errors.industry}>
          <Select id="industry" value={v.industry} onChange={set("industry")} options={options.industries.map((i) => ({ value: i.slug, label: i.name }))} includeOpen error={errors.industry} disabled={submitting} />
        </Field>
        <Field id="budget" label="Budget range" error={errors.budget}>
          <Select id="budget" value={v.budget} onChange={set("budget")} options={o.budget_range} error={errors.budget} disabled={submitting} />
        </Field>
        <Field id="timeline" label="Timeline" error={errors.timeline}>
          <Select id="timeline" value={v.timeline} onChange={set("timeline")} options={o.timeline} error={errors.timeline} disabled={submitting} />
        </Field>
        <Field id="contact_method" label="Preferred contact method" error={errors.contact_method}>
          <Select id="contact_method" value={v.contact_method} onChange={set("contact_method")} options={o.contact_method} error={errors.contact_method} disabled={submitting} />
        </Field>
      </div>

      <Field id="message" label="Project description" required error={errors.message} hint="What are you building, who is it for, and what would a great outcome look like?">
        <TextArea id="message" value={v.message} onChange={set("message")} error={errors.message} required maxLength={5000} disabled={submitting} placeholder="A short description of your project…" hint="What are you building, who is it for, and what would a great outcome look like?" />
      </Field>

      <Checkbox id="privacy_acknowledged" checked={v.privacy_acknowledged} onChange={set("privacy_acknowledged")} error={errors.privacy_acknowledged} disabled={submitting}>
        <PrivacyText notice={privacyNotice} fallback="I agree that Qmona may store and use these details to respond to my inquiry." />
        <span className="text-accent" aria-hidden="true"> *</span>
      </Checkbox>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" arrow disabled={submitting} aria-disabled={submitting} className="w-full justify-between">
          {submitting ? "Sending…" : "Send Request"}
        </Button>
        <p id="contact-form-note" className="text-center text-[0.8125rem] text-muted">
          No account needed. We reply by email.
        </p>
      </div>
    </form>
  );
}
