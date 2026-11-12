import type { Request, Response } from "express";
import { ApiError } from "../../errors/api-error.js";
import { SESSION_COOKIE } from "../../lib/cookies.js";
import { escapeRegex, isObjectId, qs, qsBool } from "../../lib/query.js";
import { pageParams, paginated } from "../../lib/pagination.js";
import { currentUser } from "../../middleware/auth.js";
import { logAudit } from "../audit/audit.service.js";
import { createUserSchema, setPasswordSchema, updateUserSchema } from "./user.validation.js";
import { User } from "./user.model.js";
import { ROLES } from "./user.interface.js";
import { assertSelfChangeAllowed, createUser, serializeUser, setUserPassword } from "./user.service.js";
import { destroyUserSessions } from "../auth/session.service.js";

function userFilter(req: Request) {
  const clauses: Record<string, unknown>[] = [];
  const role = qs(req, "role");
  if (role && (ROLES as readonly string[]).includes(role)) clauses.push({ role });
  const active = qsBool(req, "is_active");
  if (active !== null) clauses.push({ is_active: active });
  const search = qs(req, "search").slice(0, 100);
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    clauses.push({ $or: [{ email: re }, { username: re }, { first_name: re }, { last_name: re }] });
  }
  return clauses.length ? { $and: clauses } : {};
}

async function findUser(req: Request) {
  const id = String(req.params.id);
  if (!isObjectId(id)) throw ApiError.notFound();
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound();
  return user;
}

export async function listUsers(req: Request, res: Response) {
  const { page, pageSize, skip } = pageParams(req);
  const filter = userFilter(req);
  const [docs, count] = await Promise.all([
    User.find(filter).sort({ date_joined: -1 }).skip(skip).limit(pageSize).lean(),
    User.countDocuments(filter),
  ]);
  res.json(paginated(req, docs.map(serializeUser), count, page, pageSize));
}

export async function getUser(req: Request, res: Response) {
  res.json(serializeUser((await findUser(req)).toObject()));
}

export async function postUser(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body ?? {});
  const user = await createUser(input);
  await logAudit({ req, action: "create", target_model: "User", target_id: String(user._id), details: { email: user.email, role: user.role } });
  res.status(201).json(serializeUser(user.toObject()));
}

export async function patchUser(req: Request, res: Response) {
  const actor = currentUser(req);
  const user = await findUser(req);
  const changes = updateUserSchema.parse(req.body ?? {});
  assertSelfChangeAllowed(actor, String(user._id), changes);
  user.set(changes);
  await user.save();
  // Disabling an account or changing its role takes effect immediately.
  if (changes.is_active === false || changes.role) await destroyUserSessions(String(user._id));
  await logAudit({ req, action: "update", target_model: "User", target_id: String(user._id), details: { fields: Object.keys(changes).sort() } });
  res.json(serializeUser(user.toObject()));
}

export async function postSetPassword(req: Request, res: Response) {
  const actor = currentUser(req);
  const { password } = setPasswordSchema.parse(req.body ?? {});
  const target = await findUser(req);
  const keep = actor.id === String(target._id) ? (req.cookies?.[SESSION_COOKIE] as string | undefined) : undefined;
  await setUserPassword(String(target._id), password, keep);
  await logAudit({ req, action: "update", target_model: "User", target_id: String(target._id), details: { password_reset: true } });
  res.json({ detail: "Password updated." });
}
