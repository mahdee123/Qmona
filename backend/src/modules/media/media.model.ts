import { Schema, model, type Types } from "mongoose";

export const FILE_TYPES = ["image", "svg", "document"] as const;
export type FileType = (typeof FILE_TYPES)[number];

export interface MediaAttrs {
  title: string;
  alt_text: string;
  caption: string;
  original_filename: string;
  /** Path relative to the upload directory, e.g. uploads/2026/11/<random>.png */
  file: string;
  file_type: FileType;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  uploaded_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const mediaSchema = new Schema<MediaAttrs>(
  {
    title: { type: String, required: true, trim: true, maxlength: 255, index: true },
    alt_text: { type: String, default: "", trim: true, maxlength: 255 },
    caption: { type: String, default: "", trim: true, maxlength: 300 },
    original_filename: { type: String, default: "", maxlength: 255 },
    file: { type: String, required: true, maxlength: 255 },
    file_type: { type: String, enum: FILE_TYPES, default: "image" },
    mime_type: { type: String, required: true, index: true },
    file_size: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const MediaAsset = model<MediaAttrs>("MediaAsset", mediaSchema);
