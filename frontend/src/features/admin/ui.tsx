"use client";

import Link from "next/link";
import { ChevronDown, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const adminInput =
  "w-full rounded-[12px] border border-line bg-card px-3.5 text-[0.9375rem] text-ink outline-none transition placeholder:text-subtle focus:border-ink/40 focus:ring-2 focus:ring-ink/10 aria-[invalid=true]:border-danger disabled:bg-page disabled:text-muted";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
      <div className="space-y-1.5">
        {back && <Link href={back.href} className="text-[0.875rem] text-muted hover:text-ink">← {back.label}</Link>}
        <h1 className="text-[1.75rem] font-bold tracking-[-0.04em]">{title}</h1>
        {description && <p className="max-w-2xl text-[0.9375rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-[20px] border border-line bg-card p-5 shadow-[0_1px_2px_rgba(1,3,9,0.04)]", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[1.0625rem] font-bold tracking-[-0.02em]">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
export function Btn({
  children, variant = "secondary", className, loading, href, ...rest
}: { children: ReactNode; variant?: BtnVariant; loading?: boolean; href?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cn(
    "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-[0.875rem] font-medium transition disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-ink text-white hover:bg-ink-deep",
    variant === "secondary" && "border border-line bg-card text-ink hover:border-line-strong hover:bg-page",
    variant === "danger" && "bg-danger text-white hover:bg-danger/90",
    variant === "ghost" && "text-body hover:bg-page hover:text-ink",
    className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest} type={rest.type || "button"}>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function StatusBadge({ value, tone }: { value: string; tone?: "green" | "gray" | "amber" | "red" | "blue" | "dark" }) {
  const auto = tone || (/(published|active|live|sent|visible|qualified|delivered|yes)/i.test(value) ? "green"
    : /(draft|pending|new|reviewing|concept|design)/i.test(value) ? "amber"
    : /(failed|spam|archived)/i.test(value) ? "red" : "gray");
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium capitalize",
      auto === "green" && "bg-success/10 text-success",
      auto === "amber" && "bg-warning/10 text-warning",
      auto === "red" && "bg-danger/10 text-danger",
      auto === "gray" && "bg-page text-muted",
      auto === "blue" && "bg-blue-50 text-blue-700",
      auto === "dark" && "bg-ink text-white",
    )}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function FormRow({ id, label, help, error, required, children, className }: { id: string; label: string; help?: ReactNode; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
        {label}{required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      {children}
      {help && !error && <p id={`${id}-help`} className="text-[0.75rem] text-muted">{help}</p>}
      {error && <p id={`${id}-error`} className="text-[0.75rem] font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Toggle({ id, checked, onChange, label, disabled, description, hideLabel }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; description?: string; hideLabel?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50", checked ? "bg-success" : "bg-line-strong")}
      >
        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
      <label htmlFor={id} className={cn("cursor-pointer", hideLabel && "sr-only")}>
        <span className="block text-[0.875rem] font-medium text-ink">{label}</span>
        {description && <span className="block text-[0.75rem] text-muted">{description}</span>}
      </label>
    </div>
  );
}

export function SelectBox({ id, value, onChange, options, placeholder, disabled, invalid }: {
  id: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; disabled?: boolean; invalid?: boolean;
}) {
  return (
    <div className="relative">
      <select id={id} value={value} disabled={disabled} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} className={cn(adminInput, "h-10 appearance-none pr-9")}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}

/** Accessible modal built on <dialog> (focus trap, Esc to close). */
export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cn("m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-hidden rounded-[24px] bg-card p-0 text-ink shadow-[var(--shadow-soft)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm", wide ? "max-w-5xl" : "max-w-lg")}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={titleId} className="text-[1.0625rem] font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-page"><X className="h-5 w-5" /></button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, busy, children }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; busy?: boolean; children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={<><Btn onClick={onCancel}>Cancel</Btn><Btn variant="danger" onClick={onConfirm} loading={busy}>{confirmLabel}</Btn></>}
    >
      <div className="space-y-3 text-[0.9375rem] text-body">{message}{children}</div>
    </Modal>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-[0.9375rem] text-muted" role="status">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-[14px] border border-danger/30 bg-danger/5 px-4 py-3 text-[0.875rem] text-danger">
      <span>{message}</span>
      {onRetry && <Btn onClick={onRetry}>Retry</Btn>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[16px] border border-dashed border-line-strong px-4 py-10 text-center text-[0.9375rem] text-muted">{children}</div>;
}
