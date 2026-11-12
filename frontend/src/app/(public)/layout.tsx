import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Logo } from "@/components/layout/logo";
import { MotionProvider } from "@/components/ui/motion";
import { getSite } from "@/lib/api";
import { JsonLd, organizationJsonLd } from "@/lib/seo";

// Rendered per request; API data itself is cached with tags (see lib/api.ts),
// so the build does not depend on the backend being reachable.
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  return (
    <MotionProvider enabled={site.profile.animations_enabled}>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-5 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Header logo={<Logo profile={site.profile} />} items={site.navigation.header} />
      {/* Dashed vertical guides at the container edges (reference signature detail) */}
      <div className="container-q pointer-events-none fixed inset-x-0 top-0 -z-0 hidden h-dvh desktop:block" aria-hidden="true">
        <div className="guides h-full w-full" />
      </div>
      <main id="main" className="relative flex min-h-dvh flex-col pt-[84px]">
        {children}
      </main>
      <Footer site={site} />
      <JsonLd data={organizationJsonLd(site)} />
    </MotionProvider>
  );
}
