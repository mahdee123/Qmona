"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "super_admin" | "content_editor" | "inquiry_manager";
  role_display: string;
  is_superuser: boolean;
  capabilities: { manage_content: boolean; manage_inquiries: boolean; manage_users: boolean; view_audit_log: boolean };
}

export const MeContext = createContext<AdminUser | null>(null);
export const useMe = () => useContext(MeContext);

/** Fetch JSON from the API with loading / error / reload state. Pass null to skip. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ClientApiError | Error | null>(null);
  const [loading, setLoading] = useState(!!path);
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    try {
      const res = await api<T>(path, { signal: c.signal });
      if (!c.signal.aborted) setData(res);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(e as Error);
    } finally {
      if (!c.signal.aborted) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
    return () => ctrl.current?.abort();
  }, [load]);

  return { data, setData, error, loading, reload: load };
}

export function listOf<T>(data: T[] | { results: T[] } | null | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.results;
}

/** Minimal toast notifications (aria-live). */
type Toast = { id: number; message: string; tone: "success" | "error" };
export const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return { toasts, push };
}

export function errorMessage(e: unknown) {
  if (e instanceof ClientApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
