import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { env } from "../config/env.js";

export interface Limits {
  /** Requests per minute per client for the whole API. */
  anonPerMin: number;
  /** Login attempts per minute per client. */
  login: number;
  /** Contact/support submissions per hour per client. */
  inquiryPerHour: number;
}

export const defaultLimits: Limits = {
  anonPerMin: env.THROTTLE_ANON_PER_MIN,
  login: env.THROTTLE_LOGIN,
  inquiryPerHour: env.THROTTLE_INQUIRY,
};

function limiter(windowMs: number, limit: number, scope: string): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // The key is req.ip, which honours TRUST_PROXY so the real visitor address is used behind the gateway.
    handler: (_req, res) => {
      res.status(429).json({
        detail: "Too many requests. Please wait a little and try again.",
        code: "throttled",
        errors: {},
        scope,
      });
    },
  });
}

export function createLimiters(limits: Limits) {
  return {
    api: limiter(60_000, limits.anonPerMin, "api"),
    login: limiter(60_000, limits.login, "login"),
    inquiry: limiter(3_600_000, limits.inquiryPerHour, "inquiry"),
  };
}
