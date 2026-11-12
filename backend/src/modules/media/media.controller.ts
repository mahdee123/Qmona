import type { Request, Response } from "express";
import { Types, type QueryFilter } from "mongoose";
import { ApiError } from "../../errors/api-error.js";
import { findMediaReferences } from "../../lib/media-refs.js";
import { pageParams, paginated } from "../../lib/pagination.js";
import { isObjectId, qs, searchFilter } from "../../lib/query.js";
import type { Doc } from "../../lib/serialize.js";
import { logAudit } from "../audit/audit.service.js";
import { MediaAsset, type FileType, type MediaAttrs } from "./media.model.js";
import { deleteStoredFile, mediaUrl, storeFile, validateUpload } from "./media.service.js";
import { updateMediaSchema, uploadFieldsSchema } from "./media.validation.js";

const SORTABLE = ["created_at", "title", "file_size"];

function serializeAsset(a: Doc) {
  return {
    id: String(a._id),
    title: a.title,
    alt_text: a.alt_text,
    caption: a.caption,
    original_filename: a.original_filename,
    file_url: mediaUrl(a.file),
    file_type: a.file_type,
    mime_type: a.mime_type,
    file_size: a.file_size,
    width: a.width,
    height: a.height,
    uploaded_by_email: a.uploaded_by?.email ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

async function findAsset(req: Request): Promise<Doc> {
  const id = String(req.params.id);
  if (!isObjectId(id)) throw ApiError.notFound();
  const doc = await MediaAsset.findById(id).populate("uploaded_by", "email").lean();
  if (!doc) throw ApiError.notFound();
  return doc;
}

export async function listMedia(req: Request, res: Response) {
  const clauses: QueryFilter<MediaAttrs>[] = [];
  const fileType = qs(req, "file_type");
  if (fileType) clauses.push({ file_type: fileType as FileType });
  const mime = qs(req, "mime_type");
  if (mime) clauses.push({ mime_type: mime });
  const search = searchFilter(qs(req, "search"), ["title", "alt_text", "caption", "original_filename"]);
  if (search) clauses.push(search);
  const filter = clauses.length ? { $and: clauses } : {};

  const ordering = qs(req, "ordering");
  const field = ordering.replace(/^-/, "");
  const sort: Record<string, 1 | -1> = SORTABLE.includes(field) ? { [field]: ordering.startsWith("-") ? -1 : 1 } : { created_at: -1 };

  const { page, pageSize, skip } = pageParams(req);
  const [docs, count] = await Promise.all([
    MediaAsset.find(filter).sort({ ...sort, _id: 1 }).skip(skip).limit(pageSize).populate("uploaded_by", "email").lean(),
    MediaAsset.countDocuments(filter),
  ]);
  res.json(paginated(req, docs.map(serializeAsset), count, page, pageSize));
}

export async function getMedia(req: Request, res: Response) {
  const doc = await findAsset(req);
  res.json({ ...serializeAsset(doc), references: await findMediaReferences(String(doc._id)) });
}

export async function postMedia(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw ApiError.fieldError("file", "No file was submitted.");
  const fields = uploadFieldsSchema.parse(req.body ?? {});
  const checked = await validateUpload(file);
  const stored = await storeFile(file.buffer, checked.ext);
  const original = file.originalname.slice(0, 255) || "upload";
  try {
    const asset = await MediaAsset.create({
      title: (fields.title || original.replace(/\.[^.]+$/, "")).slice(0, 255),
      alt_text: fields.alt_text,
      caption: fields.caption,
      original_filename: original,
      file: stored,
      file_type: checked.file_type,
      mime_type: checked.mime_type,
      file_size: file.size,
      width: checked.width,
      height: checked.height,
      uploaded_by: req.user ? new Types.ObjectId(req.user.id) : null,
    });
    await logAudit({ req, action: "create", target_model: "MediaAsset", target_id: String(asset._id), details: { label: asset.title } });
    const doc = await findAsset({ params: { id: String(asset._id) } } as unknown as Request);
    res.status(201).json({ ...serializeAsset(doc), references: [] });
  } catch (err) {
    // Do not leave an orphan file behind if the database write failed.
    await deleteStoredFile(stored);
    throw err;
  }
}

export async function patchMedia(req: Request, res: Response) {
  const existing = await findAsset(req);
  const changes = updateMediaSchema.parse(req.body ?? {});
  await MediaAsset.updateOne({ _id: existing._id }, { $set: changes });
  await logAudit({ req, action: "update", target_model: "MediaAsset", target_id: String(existing._id), details: { fields: Object.keys(changes).sort() } });
  const doc = await findAsset(req);
  res.json({ ...serializeAsset(doc), references: await findMediaReferences(String(doc._id)) });
}

export async function deleteMedia(req: Request, res: Response) {
  const doc = await findAsset(req);
  const references = await findMediaReferences(String(doc._id));
  if (references.length) {
    throw ApiError.conflict(
      "media_in_use",
      "This file is used on the website and cannot be deleted. Remove it from the listed places first.",
      { references },
    );
  }
  await MediaAsset.deleteOne({ _id: doc._id });
  await deleteStoredFile(doc.file);
  await logAudit({ req, action: "delete", target_model: "MediaAsset", target_id: String(doc._id), details: { label: doc.title } });
  res.status(204).send();
}
