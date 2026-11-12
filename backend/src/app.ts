import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./errors/error-handler.js";
import { logger } from "./lib/logger.js";
import { csrfProtection } from "./middleware/csrf.js";
import { createLimiters, defaultLimits, type Limits } from "./middleware/rate-limit.js";
import { loadSession } from "./middleware/session.js";
import { uploadRoot } from "./modules/media/media.service.js";
import { apiRouter } from "./routes/index.js";

export type Limiters = ReturnType<typeof createLimiters>;

export interface AppOptions {
  /** Override rate limits (tests use this). */
  limits?: Partial<Limits>;
}

/** Builds the Express app without starting it, so tests can import it. server.ts starts it. */
export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const limiters = createLimiters({ ...defaultLimits, ...options.limits });

  app.disable("x-powered-by");
  // Behind Cloudflare -> gateway nginx -> Next.js the visitor address is in X-Forwarded-For.
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // Uploaded images are served by this app. nosniff + a sandboxing CSP stop an uploaded file from running as a page.
  app.use(
    "/media",
    express.static(uploadRoot, {
      dotfiles: "deny",
      index: false,
      fallthrough: true,
      maxAge: "30d",
      immutable: true,
      setHeaders(res) {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ALLOWED_ORIGINS,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRFToken", "Accept"],
    }),
  );

  app.use((req, res, next) => {
    res.on("finish", () => {
      // Request line only: no query strings (may carry search terms), cookies or bodies.
      logger.debug("request", { method: req.method, path: req.path, status: res.statusCode });
    });
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api/v1", limiters.api, loadSession, csrfProtection, apiRouter(limiters));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
