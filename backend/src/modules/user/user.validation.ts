import { z } from "zod";
import { email, text } from "../../lib/validators.js";
import { ROLES } from "./user.interface.js";

export const createUserSchema = z.object({
  username: z.string().trim().min(1, "This field is required.").max(150).regex(/^[\w.@+-]+$/, "Letters, digits and @/./+/-/_ only."),
  email,
  first_name: text(150).default(""),
  last_name: text(150).default(""),
  role: z.enum(ROLES).default("content_editor"),
  password: z.string().min(10, "Password must be at least 10 characters.").max(256),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  username: createUserSchema.shape.username.optional(),
  email: email.optional(),
  first_name: text(150).optional(),
  last_name: text(150).optional(),
  role: z.enum(ROLES).optional(),
  is_active: z.boolean().optional(),
});

export const setPasswordSchema = z.object({
  password: z.string().min(10, "Password must be at least 10 characters.").max(256),
});

export const loginSchema = z.object({
  username_or_email: z.string().trim().min(1, "This field is required.").max(254),
  password: z.string().min(1, "This field is required.").max(256),
});
