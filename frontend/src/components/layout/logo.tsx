import Image from "next/image";
import Link from "next/link";
import type { SiteProfile } from "@/types";
import { cn } from "@/lib/utils";

/** Admin-uploaded logo if set, otherwise the bundled Qmona brand SVG. */
export function Logo({ profile, dark = false, className }: { profile: SiteProfile; dark?: boolean; className?: string }) {
  const custom = dark ? profile.logo_on_dark || profile.logo : profile.logo;
  const src = custom?.url || (dark ? "/images/brand/logo-full-dark.svg" : "/images/brand/logo-full.svg");
  const width = custom?.width || 121;
  const height = custom?.height || 31;
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center", className)} aria-label={`${profile.short_name || profile.agency_name} — home`}>
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        priority
        unoptimized
        className="h-8 w-auto"
      />
    </Link>
  );
}
