import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import multer from "multer";
import { ApiError } from "./api-error.js";
import { logger } from "../lib/logger.js";

/** Collapse zod issues into { field: [message] }; nested paths report on their top-level field. */
export function zodToErrors(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const field = issue.path.length ? String(issue.path[0]) : "non_field_errors";
    const nested = issue.path.length > 1 ? `${issue.path.slice(1).join(".")}: ` : "";
    (out[field] ??= []).push(`${nested}${issue.message}`);
  }
  return out;
}

function firstMessage(errors: Record<string, string[]>): string {
  return errors.non_field_errors?.[0] ?? "Please correct the highlighted fields.";
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(ApiError.notFound());
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const send = (status: number, detail: string, code: string, errors: Record<string, string[]> = {}, extra = {}) =>
    res.status(status).json({ detail, code, errors, ...extra });

  if (err instanceof ApiError) {
    return send(err.status, err.message, err.code, err.errors, err.extra);
  }
  if (err instanceof ZodError) {
    const errors = zodToErrors(err);
    return send(400, firstMessage(errors), "validation_error", errors);
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    const message = tooBig ? "File is too large." : "Upload could not be processed.";
    return send(tooBig ? 413 : 400, message, "validation_error", { file: [message] });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const errors: Record<string, string[]> = {};
    for (const [field, e] of Object.entries(err.errors)) errors[field] = [e.message];
    return send(400, firstMessage(errors), "validation_error", errors);
  }
  if (err instanceof mongoose.Error.CastError) {
    return send(404, "Not found.", "not_found");
  }
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    const keys = Object.keys((err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {});
    const field = keys.find((k) => k !== "kind") ?? keys[0] ?? "non_field_errors";
    const message = "A record with this value already exists.";
    return send(400, message, "validation_error", { [field]: [message] });
  }
  // Errors raised by Node/Express helpers (static files, body parser) that already carry a client status.
  const status = (err as { status?: unknown }).status;
  if (typeof status === "number" && status >= 400 && status < 500 && (err as { expose?: boolean }).expose !== false) {
    return send(status, status === 404 ? "Not found." : "Request could not be processed.", status === 404 ? "not_found" : "bad_request");
  }
  const type = (err as { type?: string }).type;
  if (type === "entity.too.large") return send(413, "Request body is too large.", "payload_too_large");
  if (type === "entity.parse.failed") return send(400, "Request body is not valid JSON.", "parse_error");

  // Unknown failure: log without request bodies or headers, never leak internals to the client.
  logger.error("unhandled error", {
    method: req.method,
    path: req.path,
    name: err instanceof Error ? err.name : "unknown",
    message: err instanceof Error ? err.message : String(err),
  });
  return send(500, "Server error. Please try again.", "server_error");
};
