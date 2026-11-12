"use client";

import type { ApiErrorBody } from "@/types";

/**
 * Browser-side API client. Requests go same-origin to /api/v1 (proxied to
 * the backend by next.config rewrites) so the session + CSRF cookies apply.
 */

export class ClientApiError extends Error {
  status: number;
  body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.detail || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.body.errors || {})) {
      out[k] = Array.isArray(v) ? String(v[0]) : String(v);
    }
    return out;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfPromise: Promise<string> | null = null;

export async function ensureCsrf(): Promise<string> {
  const existing = readCookie("csrftoken");
  if (existing) return existing;
  if (!csrfPromise) {
    csrfPromise = fetch("/api/v1/auth/csrf/", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { csrfToken: string }) => readCookie("csrftoken") || d.csrfToken)
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

type Json = Record<string, unknown> | unknown[] | null;

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: Json | FormData; signal?: AbortSignal; raw?: boolean } = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["X-CSRFToken"] = await ensureCsrf();
  }

  const url = path.startsWith("/api/") ? path : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method, headers, body, credentials: "same-origin", signal: options.signal });

  if (options.raw) {
    if (!res.ok) throw new ClientApiError(res.status, { detail: `Request failed (${res.status})`, code: "error", errors: {} });
    return res as unknown as T;
  }
  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const fallback: ApiErrorBody = {
      detail:
        res.status === 429
          ? "Too many requests. Please wait a little and try again."
          : res.status >= 500
            ? "The server had a problem. Please try again in a moment."
            : `Request failed (${res.status}).`,
      code: res.status === 429 ? "throttled" : "error",
      errors: {},
    };
    const bodyObj = data && typeof data === "object" && "detail" in (data as object) ? (data as ApiErrorBody) : fallback;
    throw new ClientApiError(res.status, { ...fallback, ...bodyObj, errors: bodyObj.errors || {} });
  }
  return data as T;
}
