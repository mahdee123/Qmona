import { Types } from "mongoose";
import { ApiError } from "../../errors/api-error.js";
import type { Doc } from "../../lib/serialize.js";
import { destroyUserSessions } from "../auth/session.service.js";
import { hashPassword, passwordProblems, verifyPassword, DUMMY_HASH } from "./password.js";
import { ROLE_LABELS, capabilities, type AuthUser, type Role } from "./user.interface.js";
import { User } from "./user.model.js";

/** The user representation returned by the API (never includes the password hash). */
export function serializeUser(u: Doc) {
  const role = u.role as Role;
  return {
    id: String(u.id ?? u._id),
    username: u.username,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role,
    role_display: ROLE_LABELS[role],
    is_active: u.is_active,
    is_superuser: role === "super_admin",
    date_joined: u.date_joined,
    last_login: u.last_login,
    capabilities: capabilities({ role }),
  };
}

export function assertStrongPassword(password: string, who: { email?: string; username?: string }) {
  const problems = passwordProblems(password, who);
  if (problems.length) throw ApiError.validation({ password: problems }, problems[0]);
}

/** Verifies credentials. Returns the user document or null; always spends similar time either way. */
export async function authenticate(identifier: string, password: string) {
  const id = identifier.trim();
  const user = await User.findOne(id.includes("@") ? { email: id.toLowerCase() } : { username: id });
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok || !user.is_active) return null;
  return user;
}

export async function createUser(input: {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  password: string;
  is_active?: boolean;
}) {
  assertStrongPassword(input.password, input);
  const { password, ...rest } = input;
  return User.create({ ...rest, password_hash: await hashPassword(password) });
}

export async function setUserPassword(userId: string, password: string, keepSessionToken?: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound();
  assertStrongPassword(password, user);
  user.password_hash = await hashPassword(password);
  await user.save();
  // A changed password signs the account out everywhere else.
  await destroyUserSessions(String(user._id), keepSessionToken);
  return user;
}

/** Super Admins cannot lock themselves out or demote themselves. */
export function assertSelfChangeAllowed(actor: AuthUser, targetId: string, changes: { is_active?: boolean; role?: Role }) {
  if (actor.id !== targetId) return;
  if (changes.is_active === false) throw ApiError.fieldError("is_active", "You cannot deactivate your own account.");
  if (changes.role && changes.role !== "super_admin") throw ApiError.fieldError("role", "You cannot remove your own Super Admin role.");
}

export function userIdFilter(id: string) {
  return Types.ObjectId.isValid(id) && id.length === 24 ? { _id: new Types.ObjectId(id) } : null;
}
