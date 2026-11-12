import type { RequestHandler } from "express";
import { SESSION_COOKIE } from "../lib/cookies.js";
import { findSessionUser } from "../modules/auth/session.service.js";

/** Attaches req.user when the request carries a valid session cookie. Never rejects by itself. */
export const loadSession: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) req.user = (await findSessionUser(token)) ?? undefined;
  next();
};
