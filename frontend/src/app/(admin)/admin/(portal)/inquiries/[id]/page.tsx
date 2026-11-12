"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Mail, Phone, RefreshCw, Trash2 } from "lucide-react";
import { use, useState } from "react";
import { api } from "@/lib/client-api";
import { cn, formatDate } from "@/lib/utils";
import { errorMessage, listOf, useApi, useToast } from "@/features/admin/hooks";
import { RequireCap } from "@/features/admin/shell";
import { adminInput, Btn, Card, ConfirmDialog, ErrorBox, FormRow, Loading, PageHeader, SelectBox, StatusBadge } from "@/features/admin/ui";
import { INQUIRY_STATUSES } from "@/features/admin/constants";

interface UserRef { id: string; email: string; name: string }
interface Inquiry {
  id: string; reference: string; inquiry_type: string; full_name: string; email: string; phone_country_code: string; phone: string;
  company: string; topic: string; subject: string; support_category: string; service: { title: string; slug: string } | null;
  industry: { name: string } | null; product_type: { name: string } | null; project_reference: { title: string; slug: string } | null;
  project_reference_text: string; estimated_budget: string; estimated_timeline: string; preferred_contact_method: string;
  submitted_choices: Record<string, string>; message: string; privacy_acknowledged: boolean; source_page: string;
  is_read: boolean; is_archived: boolean; archived_at: string | null; assigned_to: UserRef | null; status: string;
  notification_status: string; notification_error: string; notification_attempts: number; notification_sent_at: string | null;
  ip_address: string | null; created_at: string; updated_at: string;
  notes: { id: string; author: UserRef | null; note: string; created_at: string }[];
  status_history: { id: string; from_status: string; to_status: string; changed_by: UserRef | null; comment: string; created_at: string }[];
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="grid gap-1 py-2.5 tablet:grid-cols-[180px_1fr]">
      <dt className="text-[0.8125rem] text-muted">{label}</dt>
      <dd className="text-[0.9375rem] text-ink">{children}</dd>
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: inq, setData, loading, error, reload } = useApi<Inquiry>(`/manage/inquiries/${id}/`);
  const { data: assignees } = useApi<UserRef[]>("/manage/inquiries/assignees/");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (loading && !inq) return <Loading />;
  if (error || !inq) return <ErrorBox message={errorMessage(error)} onRetry={reload} />;

  async function run<T>(key: string, fn: () => Promise<T>, okMsg: string) {
    setBusy(key);
    try {
      const res = await fn();
      toast(okMsg);
      return res;
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  }

  const changeStatus = (status: string) =>
    run("status", async () => {
      const res = await api<Inquiry>(`/manage/inquiries/${id}/status/`, { method: "POST", body: { status, comment } });
      setData(res);
      setComment("");
    }, "Status updated.");

  const patch = (body: Record<string, unknown>, msg: string) =>
    run("patch", async () => setData(await api<Inquiry>(`/manage/inquiries/${id}/`, { method: "PATCH", body })), msg);

  const addNote = () =>
    note.trim() &&
    run("note", async () => {
      const n = await api<Inquiry["notes"][number]>(`/manage/inquiries/${id}/notes/`, { method: "POST", body: { note } });
      setData({ ...inq, notes: [n, ...inq.notes] });
      setNote("");
    }, "Note added.");

  const retry = () =>
    run("retry", async () => {
      await api(`/manage/inquiries/${id}/retry-notification/`, { method: "POST", body: { force: inq.notification_status === "sent" } });
      reload();
    }, "Notification attempted — see status.");

  const remove = () =>
    run("delete", async () => {
      await api(`/manage/inquiries/${id}/?confirm=${encodeURIComponent(inq.reference)}`, { method: "DELETE" });
      router.replace("/admin/inquiries");
    }, "Inquiry deleted.");

  const phone = `${inq.phone_country_code} ${inq.phone}`.trim();
  const isSupport = inq.inquiry_type === "support";

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/inquiries", label: "Inquiries" }}
        title={`${inq.full_name} — ${isSupport ? inq.subject : inq.topic || "Project inquiry"}`}
        description={<>Reference <strong className="text-ink">{inq.reference}</strong> · received {formatDate(inq.created_at, { hour: "2-digit", minute: "2-digit" })} · from {inq.source_page}</>}
        actions={
          <>
            <a href={`mailto:${inq.email}?subject=${encodeURIComponent(`Re: ${inq.subject || inq.topic || "your inquiry"} [${inq.reference}]`)}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[0.875rem] font-medium text-white"><Mail className="h-4 w-4" /> Email</a>
            {inq.phone && <a href={`tel:${phone.replace(/\s+/g, "")}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-[0.875rem] font-medium"><Phone className="h-4 w-4" /> Call</a>}
            <Btn loading={busy === "patch"} onClick={() => patch({ is_archived: !inq.is_archived }, inq.is_archived ? "Restored." : "Archived.")}>
              {inq.is_archived ? <><ArchiveRestore className="h-4 w-4" /> Unarchive</> : <><Archive className="h-4 w-4" /> Archive</>}
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /> Delete</Btn>
          </>
        }
      />

      <div className="grid gap-6 desktop:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Submission">
            <dl className="divide-y divide-line">
              <Row label="Type"><StatusBadge value={isSupport ? "support request" : "project inquiry"} tone={isSupport ? "blue" : "gray"} /></Row>
              <Row label="Name">{inq.full_name}</Row>
              <Row label="Email"><a className="underline" href={`mailto:${inq.email}`}>{inq.email}</a></Row>
              <Row label="Phone">{inq.phone ? <a className="underline" href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a> : ""}</Row>
              <Row label="Company">{inq.company}</Row>
              <Row label="Inquiry topic">{inq.topic}</Row>
              <Row label="Subject">{inq.subject}</Row>
              <Row label="Issue category">{inq.support_category}</Row>
              <Row label="Service">{inq.service?.title || (inq.submitted_choices.service_label ?? "")}</Row>
              <Row label="Industry">{inq.industry?.name || (inq.submitted_choices.industry_label ?? "")}</Row>
              <Row label="Product type">{inq.product_type?.name || (inq.submitted_choices.product_type_label ?? "")}</Row>
              <Row label="Project (context)">{inq.project_reference ? <a className="underline" href={`/work/${inq.project_reference.slug}`} target="_blank" rel="noopener">{inq.project_reference.title}</a> : ""}</Row>
              <Row label="Project reference">{inq.project_reference_text}</Row>
              <Row label="Budget">{inq.estimated_budget}</Row>
              <Row label="Timeline">{inq.estimated_timeline}</Row>
              <Row label="Preferred contact">{inq.preferred_contact_method}</Row>
              <Row label="Privacy acknowledged">{inq.privacy_acknowledged ? "Yes" : "No"}</Row>
            </dl>
            <div className="mt-4 rounded-[14px] bg-page p-4">
              <p className="mb-2 text-[0.8125rem] text-muted">Message</p>
              <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">{inq.message}</p>
            </div>
          </Card>

          <Card title="Private notes">
            <div className="space-y-3">
              <label htmlFor="new-note" className="sr-only">New note</label>
              <textarea id="new-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={5000} placeholder="Add an internal note (never visible to the client)…" className={cn(adminInput, "py-2.5")} />
              <div className="flex justify-end"><Btn variant="primary" loading={busy === "note"} disabled={!note.trim()} onClick={addNote}>Add note</Btn></div>
              <ul className="space-y-3">
                {inq.notes.map((n) => (
                  <li key={n.id} className="rounded-[14px] border border-line p-3">
                    <p className="whitespace-pre-wrap text-[0.9375rem]">{n.note}</p>
                    <p className="mt-1 text-[0.75rem] text-muted">{n.author?.name || "System"} · {formatDate(n.created_at, { hour: "2-digit", minute: "2-digit" })}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><span className="text-[0.875rem] text-muted">Current:</span><StatusBadge value={inq.status} /></div>
              <FormRow id="status-comment" label="Comment for history (optional)">
                <input id="status-comment" value={comment} onChange={(e) => setComment(e.target.value)} className={cn(adminInput, "h-10")} />
              </FormRow>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Change status">
                {INQUIRY_STATUSES.map((s) => (
                  <Btn key={s.value} variant={inq.status === s.value ? "primary" : "secondary"} disabled={busy === "status" || inq.status === s.value} onClick={() => changeStatus(s.value)}>{s.label}</Btn>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Assignment">
            <FormRow id="assignee" label="Assigned to">
              <SelectBox id="assignee" value={inq.assigned_to ? String(inq.assigned_to.id) : ""} onChange={(v) => patch({ assigned_to: v ? Number(v) : null }, "Assignment saved.")} placeholder="Unassigned" options={listOf(assignees).map((a) => ({ value: String(a.id), label: a.name }))} />
            </FormRow>
            <div className="mt-3">
              <Btn variant="ghost" onClick={() => patch({ is_read: !inq.is_read }, inq.is_read ? "Marked unread." : "Marked read.")}>Mark as {inq.is_read ? "unread" : "read"}</Btn>
            </div>
          </Card>

          <Card title="Email notification">
            <div className="space-y-2 text-[0.875rem]">
              <p className="flex items-center gap-2">Status: <StatusBadge value={inq.notification_status} /></p>
              <p className="text-muted">Attempts: {inq.notification_attempts}{inq.notification_sent_at ? ` · sent ${formatDate(inq.notification_sent_at, { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
              {inq.notification_error && <p className="rounded-[10px] bg-danger/5 p-2 text-[0.8125rem] text-danger">{inq.notification_error}</p>}
              <p className="text-[0.75rem] text-muted">The submission is always saved first; a failed email never loses the inquiry.</p>
              <Btn loading={busy === "retry"} onClick={retry}><RefreshCw className="h-4 w-4" /> {inq.notification_status === "sent" ? "Resend notification" : "Retry notification"}</Btn>
            </div>
          </Card>

          <Card title="Status history">
            {inq.status_history.length === 0 ? <p className="text-[0.875rem] text-muted">No status changes yet.</p> : (
              <ol className="space-y-3">
                {inq.status_history.map((h) => (
                  <li key={h.id} className="text-[0.875rem]">
                    <p><StatusBadge value={h.from_status} /> → <StatusBadge value={h.to_status} /></p>
                    <p className="mt-1 text-[0.75rem] text-muted">{h.changed_by?.name || "System"} · {formatDate(h.created_at, { hour: "2-digit", minute: "2-digit" })}{h.comment ? ` — ${h.comment}` : ""}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this inquiry permanently?"
        message={<>Deleting removes the submission, notes and history. To comply with a deletion request, type the reference <strong className="text-ink">{inq.reference}</strong> to confirm.</>}
        onCancel={() => { setConfirmDelete(false); setConfirmText(""); }}
        onConfirm={() => confirmText === inq.reference && remove()}
        busy={busy === "delete"}
      >
        <label htmlFor="confirm-ref" className="sr-only">Reference</label>
        <input id="confirm-ref" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={inq.reference} className={cn(adminInput, "h-10")} />
      </ConfirmDialog>
    </div>
  );
}

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireCap cap="manage_inquiries">
      <Detail id={id} />
    </RequireCap>
  );
}
