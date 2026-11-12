import { Types, type Model } from "mongoose";
import { ApiError } from "../errors/api-error.js";
import { MediaAsset } from "../modules/media/media.model.js";
import type { Doc } from "./serialize.js";

const unique = (values: unknown[]) => [...new Set(values.filter((v) => typeof v === "string") as string[])];

/** Every referenced media file must exist, otherwise a record could point to nothing. */
export async function assertMediaExist(data: Doc, fields: string[]): Promise<void> {
  for (const field of fields) {
    const value = data[field];
    const ids = unique(Array.isArray(value) ? value : [value]);
    if (!ids.length) continue;
    const found = await MediaAsset.countDocuments({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } });
    if (found !== ids.length) throw ApiError.fieldError(field, "The selected file does not exist.");
  }
}

/** Every referenced record (single id or list) must exist in `model`. */
export async function assertRefsExist(model: Model<any>, data: Doc, field: string, label = "record"): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const value = data[field];
  const ids = unique(Array.isArray(value) ? value : [value]);
  if (!ids.length) return;
  const found = await model.countDocuments({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } });
  if (found !== ids.length) throw ApiError.fieldError(field, `The selected ${label} does not exist.`);
}
