import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { ApiError } from "../../errors/api-error.js";
import { MediaAsset, type MediaAttrs } from "./media.model.js";
import { assertSafeSvg } from "./svg.js";

export const uploadRoot = path.resolve(env.UPLOAD_DIR);

/** The small representation of an image used by the public website. */
export interface PublicMedia {
  id: string;
  url: string;
  alt_text: string;
  caption: string;
  width: number | null;
  height: number | null;
  mime_type: string;
}

/** Browser-reachable URL for a stored file. The base is the public API origin, not the internal address. */
export function mediaUrl(file: string): string {
  const base = env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}/media/${file}`;
}

type MediaDoc = Pick<MediaAttrs, "alt_text" | "caption" | "width" | "height" | "mime_type" | "file"> & { _id: Types.ObjectId };

export function toPublicMedia(a: MediaDoc): PublicMedia {
  return {
    id: String(a._id),
    url: mediaUrl(a.file),
    alt_text: a.alt_text,
    caption: a.caption,
    width: a.width,
    height: a.height,
    mime_type: a.mime_type,
  };
}

/** Loads the public representation of several assets in one query. */
export async function loadMediaMap(ids: Iterable<unknown>): Promise<Map<string, PublicMedia>> {
  const valid = [...new Set([...ids].filter(Boolean).map(String))].filter((id) => Types.ObjectId.isValid(id));
  const map = new Map<string, PublicMedia>();
  if (!valid.length) return map;
  const assets = await MediaAsset.find({ _id: { $in: valid } }).lean();
  for (const a of assets) map.set(String(a._id), toPublicMedia(a));
  return map;
}

// ---------------------------------------------------------------------------
// Upload validation: the real file type comes from the content, never from the name or client MIME type.
// ---------------------------------------------------------------------------

const RASTER: Record<string, { mime: string; ext: string }> = {
  png: { mime: "image/png", ext: "png" },
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  webp: { mime: "image/webp", ext: "webp" },
};
const MAX_RASTER_PIXELS = 40_000_000;

export interface ValidatedUpload {
  file_type: "image" | "svg";
  mime_type: string;
  width: number | null;
  height: number | null;
  ext: string;
}

export async function validateUpload(file: { buffer: Buffer; size: number; originalname: string }): Promise<ValidatedUpload> {
  const maxBytes = env.MEDIA_MAX_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw ApiError.fieldError("file", `File size exceeds the maximum limit of ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
  }
  if (file.size === 0) throw ApiError.fieldError("file", "The uploaded file is empty.");

  const name = file.originalname.toLowerCase();
  const head = file.buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  const looksLikeXml = head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!--");

  if (name.endsWith(".svg") || looksLikeXml) {
    if (!name.endsWith(".svg")) throw ApiError.fieldError("file", "Vector files must use the .svg extension.");
    try {
      assertSafeSvg(file.buffer);
    } catch (err) {
      throw ApiError.fieldError("file", err instanceof Error ? err.message : "Invalid SVG.");
    }
    return { file_type: "svg", mime_type: "image/svg+xml", width: null, height: null, ext: "svg" };
  }

  try {
    const image = sharp(file.buffer, { limitInputPixels: MAX_RASTER_PIXELS, failOn: "error" });
    const meta = await image.metadata();
    const kind = meta.format ? RASTER[meta.format] : undefined;
    if (!kind) {
      throw ApiError.fieldError("file", `Unsupported image format: ${meta.format ?? "unknown"}. Allowed: PNG, JPEG, WebP and SVG.`);
    }
    // Decode a tiny version to catch truncated or corrupted files.
    await sharp(file.buffer, { limitInputPixels: MAX_RASTER_PIXELS, failOn: "error" }).resize(1, 1).raw().toBuffer();
    return { file_type: "image", mime_type: kind.mime, width: meta.width ?? null, height: meta.height ?? null, ext: kind.ext };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.fieldError("file", "Unsupported or corrupted image file.");
  }
}

// ---------------------------------------------------------------------------
// Disk storage
// ---------------------------------------------------------------------------

/** Writes the file under a random name (so it cannot be guessed or overwritten) and returns its relative path. */
export async function storeFile(buffer: Buffer, ext: string): Promise<string> {
  const now = new Date();
  const dir = path.join("uploads", String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
  const relative = path.posix.join(...dir.split(path.sep), `${randomBytes(16).toString("hex")}.${ext}`);
  const absolute = resolveInside(relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer, { flag: "wx", mode: 0o644 });
  return relative;
}

export async function deleteStoredFile(relative: string): Promise<void> {
  try {
    await unlink(resolveInside(relative));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** Resolves a stored relative path and refuses anything that would escape the upload directory. */
function resolveInside(relative: string): string {
  const absolute = path.resolve(uploadRoot, relative);
  if (absolute !== uploadRoot && !absolute.startsWith(uploadRoot + path.sep)) {
    throw new Error("Refusing to access a path outside the upload directory.");
  }
  return absolute;
}
