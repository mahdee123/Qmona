import { Types } from "mongoose";
import { ApiError } from "../errors/api-error.js";
import { MediaAsset } from "../modules/media/media.model.js";
import { loadMediaMap } from "../modules/media/media.service.js";
import { isSafeUrl } from "./urls.js";

/**
 * Structured rich content.
 * Long-form content (blog posts, legal pages) is stored as a JSON list of typed blocks instead of HTML.
 * The frontend renders each block with a React component, so no stored markup is ever injected into a page.
 * Inline formatting inside text is limited to **bold** and [label](url), which the frontend parses itself.
 */
const MAX_BLOCKS = 300;
const MAX_TEXT = 10_000;
const LINK_RE = /\[([^\]]{1,200})\]\(([^)\s]{1,500})\)/g;
const BLOCK_TYPES = new Set(["heading", "paragraph", "list", "quote", "image", "divider", "callout"]);

type Raw = Record<string, unknown>;
export type Block = Raw & { type: string };

class BlockError extends Error {}

function text(value: unknown, field: string, required = true, max = MAX_TEXT): string {
  if (value === undefined || value === null || value === "") {
    if (required) throw new BlockError(`"${field}" is required.`);
    return "";
  }
  if (typeof value !== "string") throw new BlockError(`"${field}" must be text.`);
  if (value.length > max) throw new BlockError(`"${field}" is too long (max ${max} characters).`);
  for (const match of value.matchAll(LINK_RE)) {
    if (!isSafeUrl(match[2])) throw new BlockError(`Unsafe link in "${field}": ${match[2]}`);
  }
  return value;
}

/** Validate and normalise a list of content blocks. Throws a field error on `field`. */
export async function validateBlocks(blocks: unknown, field = "body"): Promise<Block[]> {
  if (blocks === null || blocks === undefined || blocks === "") return [];
  if (!Array.isArray(blocks)) throw ApiError.fieldError(field, "Content must be a list of blocks.");
  if (blocks.length > MAX_BLOCKS) throw ApiError.fieldError(field, `Too many blocks (max ${MAX_BLOCKS}).`);

  const cleaned: Block[] = [];
  for (const [i, raw] of blocks.entries()) {
    const block = raw as Raw;
    const type = typeof block === "object" && block !== null ? String(block.type) : "";
    try {
      if (!BLOCK_TYPES.has(type)) throw new BlockError("unknown block type.");
      switch (type) {
        case "heading": {
          const level = block.level ?? 2;
          if (level !== 2 && level !== 3 && level !== 4) throw new BlockError('"level" must be 2, 3 or 4.');
          cleaned.push({ type, level, text: text(block.text, "text", true, 300) });
          break;
        }
        case "paragraph":
          cleaned.push({ type, text: text(block.text, "text") });
          break;
        case "list": {
          const items = block.items;
          if (!Array.isArray(items) || !items.length || items.length > 100) throw new BlockError('"items" must be a list of 1–100 entries.');
          cleaned.push({ type, style: block.style === "ordered" ? "ordered" : "unordered", items: items.map((it) => text(it, "item", true, 2000)) });
          break;
        }
        case "quote":
          cleaned.push({ type, text: text(block.text, "text", true, 2000), cite: text(block.cite, "cite", false, 200) });
          break;
        case "callout":
          cleaned.push({ type, text: text(block.text, "text", true, 2000) });
          break;
        case "image": {
          const id = block.media_id;
          if (typeof id !== "string" || !Types.ObjectId.isValid(id)) throw new BlockError('"media_id" is required.');
          if (!(await MediaAsset.exists({ _id: id }))) throw new BlockError("Referenced image does not exist.");
          cleaned.push({ type, media_id: id, caption: text(block.caption, "caption", false, 300), alt: text(block.alt, "alt", false, 300) });
          break;
        }
        case "divider":
          cleaned.push({ type });
          break;
      }
    } catch (err) {
      if (err instanceof BlockError) throw ApiError.fieldError(field, `Block ${i + 1} (${type || "?"}): ${err.message}`);
      throw err;
    }
  }
  return cleaned;
}

export function blocksPlainText(blocks: Block[] | undefined): string {
  const parts: string[] = [];
  for (const b of blocks ?? []) {
    if (["heading", "paragraph", "quote", "callout"].includes(b.type)) parts.push(String(b.text ?? ""));
    else if (b.type === "list") parts.push(...((b.items as string[]) ?? []));
  }
  return parts.join(" ");
}

/** Attach url / width / height to image blocks for public rendering; blocks pointing at deleted files are dropped. */
export async function resolveBlockMedia(blocks: Block[] | undefined): Promise<Block[]> {
  const list = blocks ?? [];
  const media = await loadMediaMap(list.filter((b) => b.type === "image").map((b) => b.media_id));
  const out: Block[] = [];
  for (const b of list) {
    if (b.type !== "image") {
      out.push(b);
      continue;
    }
    const m = media.get(String(b.media_id));
    if (!m) continue;
    out.push({ ...b, url: m.url, width: m.width, height: m.height, alt: (b.alt as string) || m.alt_text });
  }
  return out;
}
