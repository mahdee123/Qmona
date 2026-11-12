import { Schema, model, type Types } from "mongoose";

export interface SessionAttrs {
  token_hash: string;
  user: Types.ObjectId;
  ip: string;
  created_at: Date;
  expires_at: Date;
}

const sessionSchema = new Schema<SessionAttrs>({
  // Only the SHA-256 of the cookie value is stored, so a database leak cannot be replayed as a login.
  token_hash: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ip: { type: String, default: "" },
  created_at: { type: Date, default: Date.now },
  // MongoDB removes the document once this date passes.
  expires_at: { type: Date, required: true, index: { expires: 0 } },
});

export const Session = model<SessionAttrs>("Session", sessionSchema);
