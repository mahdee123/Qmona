import { randomBytes } from "node:crypto";
import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";

// Cookie names are kept from the original Django backend because the Next.js frontend reads them:
// the middleware checks "sessionid" and the API client sends "csrftoken" back as X-CSRFToken.
export const SESSION_COOKIE = "sessionid";
export const CSRF_COOKIE = "csrftoken";

const base: CookieOptions = { sameSite: "lax", secure: env.COOKIE_SECURE, path: "/" };

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, { ...base, httpOnly: true, maxAge: env.SESSION_TTL_HOURS * 3_600_000 });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { ...base, httpOnly: true });
}

/** The CSRF cookie must be readable by JavaScript (double-submit pattern), so it is not httpOnly. */
export function setCsrfCookie(res: Response, token = randomBytes(32).toString("base64url")): string {
  res.cookie(CSRF_COOKIE, token, { ...base, httpOnly: false, maxAge: 365 * 24 * 3_600_000 });
  return token;
}
