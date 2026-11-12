import type { Request } from "express";
import { Types } from "mongoose";

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** First value of a query parameter as a trimmed string (empty string when absent). */
export function qs(req: Request, name: string): string {
  const raw = req.query[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

/** Comma-separated and/or repeated values: ?a=x,y&a=z -> ["x","y","z"]. */
export function qsList(req: Request, ...names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    const raw = req.query[name];
    const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
    for (const v of values) {
      if (typeof v === "string") out.push(...v.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  return out.slice(0, 20);
}

export function qsBool(req: Request, name: string): boolean | null {
  const v = qs(req, name).toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
}

export function isObjectId(v: string): boolean {
  return Types.ObjectId.isValid(v) && v.length === 24;
}

/** Case-insensitive "contains" filter across several fields. */
export function searchFilter(term: string, fields: string[]): Record<string, unknown> | null {
  const clean = term.trim().slice(0, 100);
  if (!clean || !fields.length) return null;
  const re = new RegExp(escapeRegex(clean), "i");
  return { $or: fields.map((f) => ({ [f]: re })) };
}
