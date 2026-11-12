import { Schema, type SchemaOptions } from "mongoose";

/** created_at / updated_at maintained by Mongoose, named like the API fields. */
export const timestamps: Pick<SchemaOptions, "timestamps"> = {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
};

/** Optional reference to an uploaded media file. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mediaRef: any = { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null };

/** Optional reference to another collection. */
// Schema field helpers are loosely typed: strict Mongoose generics reject readonly/union literals that are fine at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ref = (model: string): any => ({ type: Schema.Types.ObjectId, ref: model, default: null });

/** Many-to-many reference list. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const refs = (model: string): any => ({ type: [{ type: Schema.Types.ObjectId, ref: model }], default: [] });

/** A list of free-form JSON objects (content blocks). Validated by lib/blocks.ts before it is stored. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mixedList: any = { type: [Schema.Types.Mixed], default: [] };

export const orderField = { type: Number, default: 0, min: 0, index: true } as const;
