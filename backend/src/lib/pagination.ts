import type { Request } from "express";
import { ApiError } from "../errors/api-error.js";
import { qs } from "./query.js";

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

export function pageParams(req: Request) {
  const page = Math.max(1, Math.floor(Number(qs(req, "page"))) || 1);
  const requested = Math.floor(Number(qs(req, "page_size"))) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, requested), MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function pageLink(req: Request, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "page") continue;
    if (typeof v === "string") params.set(k, v);
  }
  params.set("page", String(page));
  return `${req.baseUrl}${req.path}?${params.toString()}`;
}

/** The list envelope the frontend expects: { count, total_pages, page, page_size, next, previous, results }. */
export function paginated<T>(req: Request, results: T[], count: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (page > totalPages) throw ApiError.notFound("Invalid page.");
  return {
    count,
    total_pages: totalPages,
    page,
    page_size: pageSize,
    next: page < totalPages ? pageLink(req, page + 1) : null,
    previous: page > 1 ? pageLink(req, page - 1) : null,
    results,
  };
}
