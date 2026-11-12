import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * On-demand revalidation endpoint called by the backend API after content changes.
 * Body: {"tags": ["projects", "cms", ...]}; header x-revalidate-secret.
 */
const ALLOWED = new Set([
  "site", "cms", "services", "industries", "taxonomies", "projects", "blog", "legal", "faqs",
  "testimonials", "team", "pricing", "process", "credibility", "forms",
]);

function secretMatches(given: string | null) {
  const expected = process.env.REVALIDATE_SECRET || "";
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  let tags: unknown;
  try {
    tags = (await request.json())?.tags;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(tags)) return NextResponse.json({ detail: "tags must be a list" }, { status: 400 });
  const applied = tags.filter((t): t is string => typeof t === "string" && ALLOWED.has(t));
  applied.forEach((tag) => revalidateTag(tag));
  return NextResponse.json({ revalidated: applied, now: Date.now() });
}
