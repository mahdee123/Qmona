import { Types, type Model } from "mongoose";

/**
 * Registry of every place a media file can be used. Feature modules register their models here,
 * so the media library can list usages and refuse to delete a file that is still in use
 * without the media module importing every other module.
 */
export interface MediaRefSource {
  /** Machine type, e.g. "services.service". */
  type: string;
  /** Human prefix, e.g. "Service". */
  label: string;
  model: Model<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Fields holding a media ObjectId. */
  idFields?: string[];
  /** Fields holding an array of media-id strings. */
  stringFields?: string[];
  /** Dotted paths into JSON blocks, e.g. "body.media_id". */
  blockPaths?: string[];
  titleOf: (doc: Record<string, unknown>) => string;
}

const sources: MediaRefSource[] = [];

export function registerMediaRefs(source: MediaRefSource): void {
  sources.push(source);
}

export interface MediaReference {
  type: string;
  id: string;
  field: string;
  label: string;
}

export async function findMediaReferences(mediaId: string, limit = 25): Promise<MediaReference[]> {
  const oid = new Types.ObjectId(mediaId);
  const out: MediaReference[] = [];
  for (const s of sources) {
    const clauses: Record<string, unknown>[] = [];
    for (const f of s.idFields ?? []) clauses.push({ [f]: oid });
    for (const f of s.stringFields ?? []) clauses.push({ [f]: mediaId });
    for (const p of s.blockPaths ?? []) clauses.push({ [p]: mediaId });
    if (!clauses.length) continue;
    const docs = await s.model.find({ $or: clauses }).limit(limit).lean();
    for (const doc of docs as Record<string, unknown>[]) {
      const field =
        (s.idFields ?? []).find((f) => String(doc[f] ?? "") === mediaId) ??
        (s.stringFields ?? [])[0] ??
        (s.blockPaths ?? [])[0]?.split(".")[0] ??
        "";
      out.push({ type: s.type, id: String(doc._id), field, label: `${s.label}: ${s.titleOf(doc)}` });
    }
  }
  return out;
}
