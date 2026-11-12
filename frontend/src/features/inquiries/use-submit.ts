"use client";

import { useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";

export interface SubmitResult {
  detail: string;
  reference: string | null;
  duplicate?: boolean;
}

/**
 * Shared submission state: blocks double submits, maps server field errors,
 * focuses the error summary, and never clears inputs on failure.
 */
export function useInquirySubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const [result, setResult] = useState<SubmitResult | null>(null);
  const inFlight = useRef(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus());

  async function submit(payload: Record<string, unknown>, clientErrors: Record<string, string>) {
    if (inFlight.current) return;
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setMessage(undefined);
      focusSummary();
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setErrors({});
    setMessage(undefined);
    try {
      const res = await api<SubmitResult>("/inquiries/", { method: "POST", body: payload });
      setResult(res);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setErrors(err.fieldErrors());
        setMessage(err.status === 400 ? "Please check the highlighted fields." : err.message);
      } else {
        setMessage("We could not reach the server. Check your connection and try again — your message has not been lost.");
      }
      focusSummary();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return { submitting, errors, setErrors, message, result, setResult, submit, summaryRef };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
