import { Schema, model } from "mongoose";
import { ROLES, type UserAttrs } from "./user.interface.js";

const userSchema = new Schema<UserAttrs>(
  {
    username: { type: String, required: true, trim: true, maxlength: 150, unique: true },
    // Stored lowercase so lookups and the unique index are case-insensitive.
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    first_name: { type: String, default: "", trim: true, maxlength: 150 },
    last_name: { type: String, default: "", trim: true, maxlength: 150 },
    role: { type: String, enum: ROLES, default: "content_editor", index: true },
    is_active: { type: Boolean, default: true },
    password_hash: { type: String, required: true },
    last_login: { type: Date, default: null },
  },
  { timestamps: { createdAt: "date_joined", updatedAt: "updated_at" } },
);

export const User = model<UserAttrs>("User", userSchema);
