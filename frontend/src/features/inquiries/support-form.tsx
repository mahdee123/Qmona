"use client";

import { useState } from "react";
import type { FormOptions } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox, ErrorSummary, Field, Honeypot, PhoneInput, PrivacyText, Select, TextArea, TextInput } from "./fields";
import { SuccessPanel } from "./success-panel";
import { EMAIL_RE, useInquirySubmit } from "./use-submit";

const LABELS: Record<string, string> = {
  full_name: "Name", email: "Email", company: "Company", phone: "Phone", phone_country_code: "Country code",
  project_reference_text: "Project reference", subject: "Subject", support_category: "Issue category",
  message: "Description", privacy_acknowledged: "Privacy", contact_method: "Preferred contact method",
};

export function SupportForm({ options, privacyNotice }: { options: FormOptions; privacyNotice?: string }) {
  const blank = {
    full_name: "", email: "", company: "", phone_country_code: "+880", phone: "", project_reference_text: "",
    subject: "", support_category: "", contact_method: "", message: "", privacy_acknowledged: false, hp_website: "",
  };
  const [v, setV] = useState(blank);
  const { submitting, errors, message, result, setResult, submit, summaryRef } = useInquirySubmit();
  const set = <K extends keyof typeof v>(k: K) => (val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  function validate() {
    const e: Record<string, string> = {};
    if (v.full_name.trim().length < 2) e.full_name = "Enter your name.";
    if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
    if (!v.subject.trim()) e.subject = "Add a short subject.";
    if (!v.support_category) e.support_category = "Choose an issue category.";
    if (v.message.trim().length < 10) e.message = "Describe the issue (at least 10 characters).";
    if (v.phone && !/^[0-9 ()-]{5,20}$/.test(v.phone.trim())) e.phone = "Use digits only (spaces and dashes are fine).";
    if (!v.privacy_acknowledged) e.privacy_acknowledged = "Please confirm you have read the privacy notice.";
    return e;
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    submit({ inquiry_type: "support", ...v, phone_country_code: v.phone ? v.phone_country_code : "", source_page: "/support" }, validate());
  }

  if (result) return <SuccessPanel kind="support" result={result} onReset={() => { setResult(null); setV(blank); }} />;

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-6 rounded-[28px] bg-card p-5 shadow-[var(--shadow-card)] tablet:p-7">
      <Honeypot value={v.hp_website} onChange={set("hp_website")} />
      <ErrorSummary errors={errors} labels={LABELS} summaryRef={summaryRef} message={message} />

      <div className="grid gap-5 tablet:grid-cols-2">
        <Field id="full_name" label="Name" required error={errors.full_name}>
          <TextInput id="full_name" value={v.full_name} onChange={set("full_name")} error={errors.full_name} autoComplete="name" required maxLength={150} disabled={submitting} />
        </Field>
        <Field id="email" label="Email" required error={errors.email}>
          <TextInput id="email" type="email" value={v.email} onChange={set("email")} error={errors.email} autoComplete="email" required maxLength={254} disabled={submitting} inputMode="email" />
        </Field>
        <Field id="company" label="Company" error={errors.company}>
          <TextInput id="company" value={v.company} onChange={set("company")} error={errors.company} autoComplete="organization" maxLength={150} disabled={submitting} />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone || errors.phone_country_code}>
          <PhoneInput codeValue={v.phone_country_code} onCodeChange={set("phone_country_code")} value={v.phone} onChange={set("phone")} error={errors.phone} codeError={errors.phone_country_code} disabled={submitting} />
        </Field>
        <Field id="project_reference_text" label="Project reference" error={errors.project_reference_text} hint="Project name, URL or reference number if you have one.">
          <TextInput id="project_reference_text" value={v.project_reference_text} onChange={set("project_reference_text")} error={errors.project_reference_text} maxLength={200} disabled={submitting} hint="Project name, URL or reference number if you have one." />
        </Field>
        <Field id="support_category" label="Issue category" required error={errors.support_category}>
          <Select id="support_category" value={v.support_category} onChange={set("support_category")} options={options.options.support_category} error={errors.support_category} required disabled={submitting} />
        </Field>
        <Field id="subject" label="Subject" required error={errors.subject} className="tablet:col-span-2">
          <TextInput id="subject" value={v.subject} onChange={set("subject")} error={errors.subject} required maxLength={200} disabled={submitting} placeholder="e.g. Checkout page shows an error" />
        </Field>
      </div>

      <Field id="message" label="Description" required error={errors.message} hint="What happened, what you expected, and steps to reproduce if you can.">
        <TextArea id="message" value={v.message} onChange={set("message")} error={errors.message} required maxLength={5000} disabled={submitting} rows={6} hint="What happened, what you expected, and steps to reproduce if you can." />
      </Field>

      <Field id="contact_method" label="Preferred contact method" error={errors.contact_method}>
        <Select id="contact_method" value={v.contact_method} onChange={set("contact_method")} options={options.options.contact_method} error={errors.contact_method} disabled={submitting} />
      </Field>

      <Checkbox id="privacy_acknowledged" checked={v.privacy_acknowledged} onChange={set("privacy_acknowledged")} error={errors.privacy_acknowledged} disabled={submitting}>
        <PrivacyText notice={privacyNotice} fallback="I agree that Qmona may store and use these details to respond to my request." />
        <span className="text-accent" aria-hidden="true"> *</span>
      </Checkbox>

      <Button type="submit" size="lg" arrow disabled={submitting} className="w-full justify-between">
        {submitting ? "Sending…" : "Submit Request"}
      </Button>
    </form>
  );
}
