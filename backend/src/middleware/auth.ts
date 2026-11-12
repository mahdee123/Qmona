import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error.js";
import { isContentEditor, isInquiryManager, isSuperAdmin, type AuthUser } from "../modules/user/user.interface.js";

/** Authorization is always enforced here on the backend; the frontend only hides links. */
function guard(check: (u: AuthUser) => boolean): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.notAuthenticated());
    if (!check(req.user)) return next(ApiError.forbidden());
    next();
  };
}

export const requireAuth = guard(() => true);
export const requireSuperAdmin = guard(isSuperAdmin);
export const requireContentEditor = guard(isContentEditor);
export const requireInquiryManager = guard(isInquiryManager);

export function currentUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw ApiError.notAuthenticated();
  return req.user;
}
