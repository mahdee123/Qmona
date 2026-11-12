import { env } from "../config/env.js";
import { logger } from "./logger.js";

// Tags understood by frontend/src/app/api/revalidate/route.ts
export const KNOWN_TAGS = new Set([
  "site", "cms", "services", "industries", "taxonomies", "projects", "blog", "legal",
  "faqs", "testimonials", "team", "pricing", "process", "credibility", "forms",
]);

/**
 * Asks the Next.js site to drop cached public data after an editor changes content.
 * Fire-and-forget: the frontend also refreshes on a timer, so a failure here is only logged.
 */
export function triggerRevalidate(tags: Iterable<string>): void {
  const wanted = [...new Set(tags)].filter((t) => KNOWN_TAGS.has(t)).sort();
  if (!wanted.length || !env.REVALIDATION_ENABLED || !env.REVALIDATE_SECRET) return;

  void fetch(`${env.FRONTEND_URL.replace(/\/$/, "")}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": env.REVALIDATE_SECRET },
    body: JSON.stringify({ tags: wanted }),
    signal: AbortSignal.timeout(4000),
  })
    .then((res) => logger.info("frontend revalidated", { tags: wanted, status: res.status }))
    .catch((err: unknown) =>
      logger.warn("frontend revalidation failed", { tags: wanted, message: err instanceof Error ? err.message : String(err) }),
    );
}
