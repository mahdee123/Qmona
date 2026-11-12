/** True for an internal path ("/contact"), an anchor, mailto/tel, or a full http(s) URL. Blocks javascript: and data: links. */
export function isSafeUrl(url: unknown, allowRelative = true): boolean {
  if (typeof url !== "string" || !url || url.length > 500) return false;
  if (allowRelative && url.startsWith("/") && !url.startsWith("//")) return true;
  if (url.startsWith("#") || url.startsWith("mailto:") || url.startsWith("tel:")) return allowRelative;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !!parsed.host;
  } catch {
    return false;
  }
}
