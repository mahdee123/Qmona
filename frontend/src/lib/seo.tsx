import type { Metadata } from "next";
import type { Media, SiteData } from "@/types";
import { SITE_URL, absoluteUrl } from "./utils";

export function buildMetadata({
  site,
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  publishedTime,
}: {
  site: SiteData;
  title?: string;
  description?: string;
  path: string;
  image?: Media | null;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string | null;
}): Metadata {
  const p = site.profile;
  const desc = description || p.default_meta_description || p.description || undefined;
  const og = image?.url || p.og_image?.url || absoluteUrl("/images/og-default.png");
  return {
    title: title || undefined,
    description: desc,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type,
      url: absoluteUrl(path),
      siteName: p.agency_name,
      title: title || p.default_meta_title || p.agency_name,
      description: desc,
      images: [{ url: og, width: image?.width || 1200, height: image?.height || 630 }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: title || p.default_meta_title, description: desc, images: [og] },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}

/** Organization structured data built only from admin-entered facts. */
export function organizationJsonLd(site: SiteData) {
  const p = site.profile;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: p.agency_name,
    url: SITE_URL,
    logo: p.logo?.url || absoluteUrl("/images/brand/logo-icon.svg"),
  };
  if (p.description) data.description = p.description;
  if (p.email) data.email = p.email;
  if (p.phone) data.telephone = p.phone;
  if (p.address || p.city) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: p.address || undefined,
      addressLocality: p.city || undefined,
      addressCountry: p.country || undefined,
    };
  }
  if (site.socials.length) data.sameAs = site.socials.map((s) => s.url);
  return data;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
