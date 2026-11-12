"use client";

import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";
import { cn, formatDate } from "@/lib/utils";
import { errorMessage, listOf, useApi, useMe, useToast, type AdminUser } from "@/features/admin/hooks";
import { RequireCap } from "@/features/admin/shell";
import { adminInput, Btn, ErrorBox, FormRow, Loading, Modal, PageHeader, SelectBox, StatusBadge, Toggle } from "@/features/admin/ui";

interface UserRow extends AdminUser { is_active: boolean; date_joined: string; last_login: string | null }

const ROLES = [
  { value: "super_admin", label: "Super Admin — full control" },
  { value: "content_editor", label: "Content Editor — content & media" },
  { value: "inquiry_manager", label: "Inquiry Manager — inquiries & support" },
];

function Users() {
  const me = useMe();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ results: UserRow[] }>("/auth/users/?page_size=100");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", username: "", first_name: "", last_name: "", role: "content_editor", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwFor, setPwFor] = useState<UserRow | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setErrors({});
    try {
      await api("/auth/users/", { method: "POST", body: { ...form, is_active: true } });
      toast("User created. Share the password through a secure channel.");
      setCreating(false);
      setForm({ email: "", username: "", first_name: "", last_name: "", role: "content_editor", password: "" });
      reload();
    } catch (e) {
      if (e instanceof ClientApiError) setErrors(e.fieldErrors());
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function update(u: UserRow, body: Record<string, unknown>) {
    try {
      await api(`/auth/users/${u.id}/`, { method: "PATCH", body });
      toast("User updated.");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  async function setPassword() {
    if (!pwFor) return;
    setBusy(true);
    try {
      await api(`/auth/users/${pwFor.id}/set-password/`, { method: "POST", body: { password: pw } });
      toast("Password updated.");
      setPwFor(null);
      setPw("");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Users" description="Admin portal accounts. There is no public registration; only Super Admins can add users." actions={<Btn variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add user</Btn>} />
      {error && <ErrorBox message={errorMessage(error)} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <div className="overflow-x-auto rounded-[16px] border border-line bg-card">
          <table className="w-full min-w-[760px] text-left text-[0.875rem]">
            <thead className="border-b border-line bg-page/60 text-[0.75rem] uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-2.5">User</th><th className="px-3 py-2.5">Role</th><th className="px-3 py-2.5">Last login</th><th className="px-3 py-2.5">Active</th><th className="px-3 py-2.5"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {listOf(data).map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2.5"><span className="font-medium">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username}</span><span className="block text-[0.8125rem] text-muted">{u.email}</span></td>
                  <td className="px-3 py-2.5 w-72">
                    <SelectBox id={`role-${u.id}`} value={u.role} onChange={(v) => update(u, { role: v })} options={ROLES} disabled={u.id === me?.id} />
                  </td>
                  <td className="px-3 py-2.5 text-muted">{u.last_login ? formatDate(u.last_login, { hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
                  <td className="px-3 py-2.5"><Toggle id={`active-${u.id}`} checked={u.is_active} disabled={u.id === me?.id} onChange={(v) => update(u, { is_active: v })} label={`Active: ${u.email}`} hideLabel /></td>
                  <td className="px-3 py-2.5 text-right">{u.is_superuser && <StatusBadge value="superuser" tone="dark" />} <Btn variant="ghost" onClick={() => setPwFor(u)}><KeyRound className="h-4 w-4" /> Set password</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Add user" footer={<><Btn onClick={() => setCreating(false)}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={create}>Create user</Btn></>}>
        <div className="grid gap-4 tablet:grid-cols-2">
          {(["email", "username", "first_name", "last_name"] as const).map((k) => (
            <FormRow key={k} id={`nu-${k}`} label={k.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())} required={k === "email" || k === "username"} error={errors[k]}>
              <input id={`nu-${k}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={cn(adminInput, "h-10")} />
            </FormRow>
          ))}
          <FormRow id="nu-role" label="Role" className="tablet:col-span-2" error={errors.role}><SelectBox id="nu-role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES} /></FormRow>
          <FormRow id="nu-password" label="Initial password" required className="tablet:col-span-2" error={errors.password} help="At least 10 characters; common passwords are rejected.">
            <input id="nu-password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={cn(adminInput, "h-10")} />
          </FormRow>
        </div>
      </Modal>
      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`Set password — ${pwFor?.email}`} footer={<><Btn onClick={() => setPwFor(null)}>Cancel</Btn><Btn variant="primary" loading={busy} onClick={setPassword}>Save password</Btn></>}>
        <FormRow id="set-pw" label="New password" help="At least 10 characters.">
          <input id="set-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={cn(adminInput, "h-10")} />
        </FormRow>
      </Modal>
    </div>
  );
}

export default function UsersPage() {
  return <RequireCap cap="manage_users"><Users /></RequireCap>;
}
