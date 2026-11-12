import { z } from "zod";
import { text } from "../../lib/validators.js";

export const uploadFieldsSchema = z.object({
  title: text(255).optional(),
  alt_text: text(255).default(""),
  caption: text(300).default(""),
});

export const updateMediaSchema = z.object({
  title: z.string().trim().min(1, "This field is required.").max(255).optional(),
  alt_text: text(255).optional(),
  caption: text(300).optional(),
});
