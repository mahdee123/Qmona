import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getSite } from "@/lib/api";
import { SITE_URL } from "@/lib/utils";
import "./globals.css";

// Satoshi (Indian Type Foundry, ITF Free Font License — see src/styles/fonts/LICENSE-FFL.txt).
// Replaceable slot: swap the files here to change the brand typeface.
const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../styles/fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../styles/fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../styles/fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getSite();
  const defaultTitle = profile.default_meta_title || profile.agency_name;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: defaultTitle, template: `%s — ${profile.short_name || profile.agency_name}` },
    description: profile.default_meta_description || profile.description || undefined,
    applicationName: profile.agency_name,
    icons: profile.favicon?.url ? { icon: profile.favicon.url } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#f6f7f8",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await getSite();
  return (
    <html lang="en" data-accent={profile.accent || "red"} className={satoshi.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
