import { z } from "zod";
import { Types } from "mongoose";
import { ICON_KEYS } from "./icons.js";
import { isSafeUrl } from "./urls.js";

/** Turns "" into null so HTML forms can clear an optional field. */
const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

/** A MongoDB id sent as a string. */
export const objectId = z.string().refine((v) => Types.ObjectId.isValid(v) && v.length === 24, "Enter a valid id.");

/** Optional reference to another record; null clears it. */
export const optionalRef = z.preprocess(emptyToNull, objectId.nullable());

/** Many-to-many reference list. */
export const refList = z.array(objectId).max(200);

export const slug = (max = 120) =>
  z
    .string()
    .trim()
    .min(1, "This field is required.")
    .max(max, `Max ${max} characters.`)
    .regex(/^[-a-zA-Z0-9_]+$/, "Use letters, numbers, hyphens and underscores only.");

export const text = (max: number) => z.string().trim().max(max, `Max ${max} characters.`);
export const requiredText = (max: number) =>
  z.string().trim().min(1, "This field is required.").max(max, `Max ${max} characters.`);

/** Long text where leading/trailing whitespace is not trimmed away from the middle of paragraphs. */
export const longText = (max: number) => z.string().max(max, `Max ${max} characters.`).transform((v) => v.trim());

export const iconKey = z.enum(ICON_KEYS, { message: "Choose a valid icon." });

export const bool = z.boolean();

export const order = z.coerce.number().int().min(0).max(1_000_000);

/** Internal path (/contact) or full http(s) URL. */
export const linkUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || isSafeUrl(v), 'Enter an internal path (e.g. "/contact") or a full http(s) URL.');

/** Absolute http(s) URL only (external profiles). */
export const externalUrl = (max = 300) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => v === "" || isSafeUrl(v, false), "Enter a full http(s) URL.");

export const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");

/** Money amount accepted as number or numeric string; stored as a number, returned with two decimals. */
export const decimal = z.preprocess(
  (v) => (v === "" || v === undefined ? null : typeof v === "string" ? Number(v) : v),
  z.number({ message: "Enter a number." }).min(0, "Cannot be negative.").max(999_999_999_999).nullable(),
);

/**
 * A list of short texts. null clears the list. Note: schemas in this project never use zod `.default()`
 * (defaults live in the Mongoose schema) so a partial PATCH can never overwrite fields it did not send.
 */
export function stringList(label: string, maxItems = 30, maxLen = 200) {
  return z.preprocess(
    (v) => (v === null ? [] : v),
    z
      .array(z.string().trim().min(1, `Each ${label} entry must be non-empty text.`).max(maxLen, `Each ${label} entry must be at most ${maxLen} characters.`))
      .max(maxItems, `${label} must be a list of up to ${maxItems} entries.`),
  );
}

/** A list of small objects with validated string keys (key features, outcomes...). */
export function objectList(label: string, required: string[], optional: string[] = [], maxItems = 30, maxLen = 2000) {
  const field = (name: string, isRequired: boolean) =>
    isRequired
      ? z.string({ message: `Each ${label} item needs "${name}".` }).trim().min(1, `Each ${label} item needs "${name}".`).max(maxLen, `"${name}" is too long in ${label}.`)
      : z.string().trim().max(maxLen, `"${name}" is too long in ${label}.`).optional().transform((v) => v ?? "");
  const shape: Record<string, z.ZodType> = {};
  for (const k of required) shape[k] = field(k, true);
  for (const k of optional) shape[k] = field(k, false);
  return z.preprocess((v) => (v === null ? [] : v), z.array(z.object(shape)).max(maxItems, `${label} must be a list of up to ${maxItems} items.`));
}

/** Zod issues for a custom validation executed outside a schema. */
export function fail(field: string, message: string): never {
  throw new z.ZodError([{ code: "custom", path: [field], message, input: undefined }]);
}
