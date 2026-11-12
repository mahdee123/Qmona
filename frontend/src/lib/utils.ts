import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", ...opts }).format(
    new Date(value),
  );
}

export function formatMoney(amount: string | number | null | undefined, currency = "USD") {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

/** Split a CMS headline on explicit newlines so the second line can wrap independently. */
export function headlineLines(text: string) {
  return (text || "").split(/\n/).filter((l) => l.trim().length > 0);
}

export function isExternal(url: string) {
  return /^https?:\/\//.test(url);
}
