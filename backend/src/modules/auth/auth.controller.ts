import type { Request, Response } from "express";
import { ApiError } from "../../errors/api-error.js";
import { SESSION_COOKIE, clearSessionCookie, setCsrfCookie, setSessionCookie } from "../../lib/cookies.js";
import { currentUser } from "../../middleware/auth.js";
import { logAudit } from "../audit/audit.service.js";
import { loginSchema } from "../user/user.validation.js";
import { authenticate, serializeUser } from "../user/user.service.js";
import { User } from "../user/user.model.js";
import { createSession, destroySession, toAuthUser } from "./session.service.js";

/** Sets the csrftoken cookie (and returns it) before any state-changing request. */
export function getCsrf(req: Request, res: Response) {
  const existing = req.cookies?.csrftoken as string | undefined;
  const token = existing && existing.length >= 32 ? existing : undefined;
  const value = setCsrfCookie(res, token);
  res.json({ detail: "CSRF cookie set.", csrfToken: value });
}

export async function postLogin(req: Request, res: Response) {
  const { username_or_email, password } = loginSchema.parse(req.body ?? {});
  const user = await authenticate(username_or_email, password);
  if (!user) {
    await logAudit({
      req,
      action: "login_failed",
      target_model: "User",
      // Only a hint of the identifier is stored, never the password.
      details: { identifier_hint: `${username_or_email.slice(0, 3)}***` },
    });
    throw new ApiError(400, "invalid_credentials", "Invalid email/username or password.");
  }
  user.last_login = new Date();
  await user.save();
  const token = await createSession(String(user._id), req.ip ?? "");
  setSessionCookie(res, token);
  // Rotate the CSRF token on login.
  setCsrfCookie(res);
  const fresh = toAuthUser(user.toObject());
  await logAudit({ req, actor: fresh, action: "login", target_model: "User", target_id: String(user._id) });
  res.json({ detail: "Signed in.", user: serializeUser(user.toObject()) });
}

export async function postLogout(req: Request, res: Response) {
  const user = currentUser(req);
  await logAudit({ req, action: "logout", target_model: "User", target_id: user.id });
  await destroySession(req.cookies?.[SESSION_COOKIE] as string | undefined);
  clearSessionCookie(res);
  res.json({ detail: "Signed out." });
}

export async function getMe(req: Request, res: Response) {
  const user = await User.findById(currentUser(req).id).lean();
  if (!user) throw ApiError.notAuthenticated();
  res.json(serializeUser(user));
}
