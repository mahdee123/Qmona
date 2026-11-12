"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-full bg-page px-5 text-[0.9375rem] text-ink placeholder:text-subtle outline-none ring-1 ring-transparent transition focus:bg-card focus:ring-ink/20 aria-[invalid=true]:ring-danger/60 disabled:opacity-60";

export function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[0.875rem] font-medium text-body">
        {label}
        {required ? <span className="text-accent" aria-hidden="true"> *</span> : <span className="text-subtle"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-[0.8125rem] text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-[0.8125rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string) {
  return [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
}

export function TextInput({
  id, value, onChange, error, hint, type = "text", autoComplete, placeholder, required, maxLength, disabled, inputMode,
}: {
  id: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; type?: string;
  autoComplete?: string; placeholder?: string; required?: boolean; maxLength?: number; disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      aria-required={required || undefined}
      autoComplete={autoComplete}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      inputMode={inputMode}
      className={cn(inputClass, "h-12")}
    />
  );
}

export function TextArea({
  id, value, onChange, error, hint, placeholder, required, maxLength, disabled, rows = 5,
}: {
  id: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; placeholder?: string;
  required?: boolean; maxLength?: number; disabled?: boolean; rows?: number;
}) {
  return (
    <textarea
      id={id}
      name={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      aria-required={required || undefined}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      rows={rows}
      className={cn(inputClass, "resize-y rounded-[24px] py-4")}
    />
  );
}

export function Select({
  id, value, onChange, options, placeholder = "Select…", error, hint, required, disabled, includeOpen = false,
}: {
  id: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
  placeholder?: string; error?: string; hint?: string; required?: boolean; disabled?: boolean;
  /** Append "Other" and "Not sure" choices if not already present. */
  includeOpen?: boolean;
}) {
  const extra = includeOpen
    ? [{ value: "other", label: "Other" }, { value: "not-sure", label: "Not sure" }].filter(
        (o) => !options.some((x) => x.value === o.value),
      )
    : [];
  return (
    <div className="relative">
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        aria-required={required || undefined}
        disabled={disabled}
        className={cn(inputClass, "h-12 appearance-none pr-12", !value && "text-subtle")}
      >
        <option value="">{placeholder}</option>
        {[...options, ...extra].map((o) => (
          <option key={o.value} value={o.value} className="text-ink">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}

export const COUNTRY_CODES = [
  { code: "+880", label: "BD +880" }, { code: "+1", label: "US/CA +1" }, { code: "+44", label: "UK +44" },
  { code: "+61", label: "AU +61" }, { code: "+49", label: "DE +49" }, { code: "+33", label: "FR +33" },
  { code: "+31", label: "NL +31" }, { code: "+46", label: "SE +46" }, { code: "+45", label: "DK +45" },
  { code: "+971", label: "AE +971" }, { code: "+966", label: "SA +966" }, { code: "+974", label: "QA +974" },
  { code: "+91", label: "IN +91" }, { code: "+92", label: "PK +92" }, { code: "+65", label: "SG +65" },
  { code: "+60", label: "MY +60" }, { code: "+81", label: "JP +81" }, { code: "+82", label: "KR +82" },
  { code: "+86", label: "CN +86" }, { code: "+90", label: "TR +90" }, { code: "+27", label: "ZA +27" },
  { code: "+234", label: "NG +234" }, { code: "+55", label: "BR +55" }, { code: "+52", label: "MX +52" },
];

export function PhoneInput({
  codeValue, onCodeChange, value, onChange, error, codeError, disabled,
}: {
  codeValue: string; onCodeChange: (v: string) => void; value: string; onChange: (v: string) => void;
  error?: string; codeError?: string; disabled?: boolean;
}) {
  return (
    <div className={cn("flex h-12 items-center rounded-full bg-page ring-1 ring-transparent focus-within:bg-card focus-within:ring-ink/20", (error || codeError) && "ring-danger/60")}>
      <label htmlFor="phone_country_code" className="sr-only">Country code</label>
      <div className="relative shrink-0">
        <select
          id="phone_country_code"
          value={codeValue}
          onChange={(e) => onCodeChange(e.target.value)}
          disabled={disabled}
          aria-invalid={codeError ? true : undefined}
          aria-describedby={codeError ? "phone_country_code-error" : undefined}
          className="h-12 appearance-none rounded-l-full bg-transparent pl-5 pr-8 text-[0.9375rem] text-ink outline-none"
        >
          {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
      <span aria-hidden="true" className="h-6 w-px bg-line-strong" />
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "phone-error" : undefined}
        placeholder="1712 345678"
        maxLength={30}
        className="h-12 min-w-0 flex-1 rounded-r-full bg-transparent px-4 text-[0.9375rem] text-ink placeholder:text-subtle outline-none"
      />
    </div>
  );
}

export function Checkbox({
  id, checked, onChange, error, children, disabled,
}: {
  id: string; checked: boolean; onChange: (v: boolean) => void; error?: string; children: ReactNode; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-line-strong accent-[var(--accent)]"
        />
        <label htmlFor={id} className="text-[0.875rem] leading-relaxed text-body">{children}</label>
      </div>
      {error && <p id={`${id}-error`} className="text-[0.8125rem] font-medium text-danger">{error}</p>}
    </div>
  );
}

/** Admin-editable privacy acknowledgement; the phrase "Privacy Policy" becomes the link (added if absent). */
export function PrivacyText({ notice, fallback }: { notice?: string; fallback: string }) {
  const text = notice || fallback;
  const link = <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">Privacy Policy</Link>;
  const idx = text.indexOf("Privacy Policy");
  if (idx === -1) return <>{text} {link}</>;
  return <>{text.slice(0, idx)}{link}{text.slice(idx + "Privacy Policy".length)}</>;
}

/** Off-screen honeypot. Real users never see or fill it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="hp_website">Website</label>
      <input id="hp_website" name="hp_website" type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function ErrorSummary({ errors, labels, summaryRef, message }: {
  errors: Record<string, string>; labels: Record<string, string>; summaryRef: React.RefObject<HTMLDivElement | null>; message?: string;
}) {
  const keys = Object.keys(errors).filter((k) => k !== "non_field_errors" && labels[k]);
  if (!keys.length && !message) return null;
  return (
    <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-[20px] border border-danger/25 bg-danger/5 p-4 outline-none">
      <p className="text-[0.9375rem] font-medium text-ink">{message || "Please fix the following:"}</p>
      {keys.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.875rem] text-danger">
          {keys.map((k) => (
            <li key={k}>
              <a href={`#${k}`} className="underline underline-offset-2">{labels[k]}: {errors[k]}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
