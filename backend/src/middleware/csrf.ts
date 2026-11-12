import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../errors/api-error.js";
import { CSRF_COOKIE } from "../lib/cookies.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Double-submit CSRF protection for every state-changing request:
 * the X-CSRFToken header must equal the csrftoken cookie, and when the browser sends an
 * Origin header it must be one of our own site origins.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && !env.CORS_ALLOWED_ORIGINS.includes(origin)) {
    return next(new ApiError(403, "csrf_failed", "Request origin is not allowed."));
  }

  const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const header = req.get("x-csrftoken");
  if (!cookie || !header || !sameToken(cookie, header)) {
    return next(new ApiError(403, "csrf_failed", "CSRF verification failed. Reload the page and try again."));
  }
  next();
};
