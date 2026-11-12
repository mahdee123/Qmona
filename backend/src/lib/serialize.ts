import type { Types } from "mongoose";
import { loadMediaMap, type PublicMedia } from "../modules/media/media.service.js";

/** A loosely-typed MongoDB document (lean object). Serializers are the typed boundary of the API. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Doc = Record<string, any>;

const isObjectId = (v: unknown): v is Types.ObjectId =>
  typeof v === "object" && v !== null && (v as { _bsontype?: string })._bsontype === "ObjectId";

/** ObjectId (or a populated document / list of them) -> string id(s). */
export function sid(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (isObjectId(v)) return String(v);
  if (typeof v === "object" && "_id" in (v as object)) return String((v as Doc)._id);
  return String(v);
}

export function sids(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => sid(x)!).filter(Boolean) : [];
}

/** Copy the listed fields, turning ObjectIds into strings. Missing fields are skipped. */
export function pick(doc: Doc, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = doc[f];
    if (v === undefined) continue;
    out[f] = isObjectId(v) ? String(v) : Array.isArray(v) && v.length && v.every(isObjectId) ? v.map(String) : v;
  }
  return out;
}

/** Money values are returned as strings with two decimals, like the original API. */
export const dec = (v: unknown): string | null => (v === null || v === undefined ? null : Number(v).toFixed(2));

/** Per-request lookup tables so serializers stay synchronous (no query per row). */
export class SerializeContext {
  constructor(
    private readonly mediaMap: Map<string, PublicMedia> = new Map(),
    private readonly extraMap: Record<string, Record<string, unknown>> = {},
  ) {}

  media(id: unknown): PublicMedia | null {
    const key = sid(id);
    return key ? (this.mediaMap.get(key) ?? null) : null;
  }

  /** Values computed per record by a resource's `extras` loader (for example related counts). */
  extra(id: unknown): Record<string, unknown> {
    const key = sid(id);
    return (key && this.extraMap[key]) || {};
  }

  static async build(mediaIds: Iterable<unknown>, extras: Record<string, Record<string, unknown>> = {}) {
    return new SerializeContext(await loadMediaMap(mediaIds), extras);
  }
}
