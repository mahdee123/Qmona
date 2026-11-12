import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:4000";

// Hosts allowed for next/image (uploaded media). Comma-separated full origins,
// e.g. "http://localhost:4000,https://api.qmona.com".
const mediaOrigins = (process.env.MEDIA_ORIGINS || "http://localhost:4000,http://127.0.0.1:4000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const remotePatterns = mediaOrigins.map((origin) => {
  const url = new URL(origin);
  return {
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    port: url.port,
    pathname: "/**",
  };
});

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    // Same-origin API + media proxy to the backend API (browser requests carry the session cookie).
    // Filesystem routes (e.g. /api/revalidate) take precedence over these rewrites.
    return [
      { source: "/api/v1/:path*/", destination: `${backendUrl}/api/v1/:path*/` },
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*/` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
    ];
  },
  async redirects() {
    return [
      { source: "/projects", destination: "/work", permanent: true },
      { source: "/projects/:slug", destination: "/work/:slug", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/start-a-project", destination: "/contact", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/preview/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
