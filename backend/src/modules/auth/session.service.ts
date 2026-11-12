import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { Session } from "./session.model.js";
import { User } from "../user/user.model.js";
import type { AuthUser } from "../user/user.interface.js";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export function toAuthUser(doc: {
  _id: Types.ObjectId;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AuthUser["role"];
  is_active: boolean;
  last_login: Date | null;
  date_joined: Date;
}): AuthUser {
  return {
    id: String(doc._id),
    username: doc.username,
    email: doc.email,
    first_name: doc.first_name,
    last_name: doc.last_name,
    role: doc.role,
    is_active: doc.is_active,
    last_login: doc.last_login,
    date_joined: doc.date_joined,
  };
}

export async function createSession(userId: string, ip: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await Session.create({
    token_hash: hash(token),
    user: new Types.ObjectId(userId),
    ip,
    expires_at: new Date(Date.now() + env.SESSION_TTL_HOURS * 3_600_000),
  });
  return token;
}

/** Returns the active user for a session cookie, or null if it is missing, expired or the user is disabled. */
export async function findSessionUser(token: string | undefined): Promise<AuthUser | null> {
  if (!token || token.length > 200) return null;
  const session = await Session.findOne({ token_hash: hash(token), expires_at: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findById(session.user).lean();
  if (!user || !user.is_active) return null;
  return toAuthUser(user);
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (token) await Session.deleteOne({ token_hash: hash(token) });
}

/** Sign a user out everywhere (used when an account is disabled or its password changes). */
export async function destroyUserSessions(userId: string, exceptToken?: string): Promise<void> {
  const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) };
  if (exceptToken) filter.token_hash = { $ne: hash(exceptToken) };
  await Session.deleteMany(filter);
}
