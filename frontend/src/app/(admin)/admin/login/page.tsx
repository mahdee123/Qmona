"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";
import { adminInput, Btn, ErrorBox, FormRow } from "@/features/admin/ui";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!identifier || !password) {
      setError("Enter your email (or username) and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/auth/login/", { method: "POST", body: { username_or_email: identifier.trim(), password } });
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError && err.status === 429 ? "Too many attempts. Please wait a minute and try again." : err instanceof ClientApiError ? err.message : "Could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-sm space-y-5 rounded-[24px] border border-line bg-card p-7 shadow-[var(--shadow-card)]">
      <div className="space-y-3">
        <Image src="/images/brand/logo-full.svg" alt="Qmona" width={121} height={31} unoptimized className="h-8 w-auto" />
        <h1 className="text-[1.5rem] font-bold tracking-[-0.03em]">Sign in to the admin portal</h1>
        <p className="text-[0.875rem] text-muted">For Qmona team members only. Accounts are created by a Super Admin.</p>
      </div>
      {error && <ErrorBox message={error} />}
      <FormRow id="identifier" label="Email or username" required>
        <input id="identifier" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={`${adminInput} h-11`} />
      </FormRow>
      <FormRow id="password" label="Password" required>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${adminInput} h-11`} />
      </FormRow>
      <Btn type="submit" variant="primary" loading={busy} className="h-11 w-full">Sign in</Btn>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
