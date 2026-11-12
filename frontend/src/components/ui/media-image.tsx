import Image from "next/image";
import type { Media } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Renders an uploaded media asset with stable dimensions. Falls back to a
 * bundled placeholder PNG. SVGs are rendered as <img> (never inlined) and
 * skip optimisation.
 */
export function MediaImage({
  media,
  fallback = "/images/placeholder-project.png",
  alt,
  className,
  sizes = "(min-width: 1200px) 50vw, 100vw",
  priority,
  fill,
  aspect,
}: {
  media: Media | null | undefined;
  fallback?: string | null;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  aspect?: string;
}) {
  const src = media?.url || fallback;
  if (!src) return null;
  const altText = alt ?? media?.alt_text ?? "";
  const isSvg = media?.mime_type === "image/svg+xml" || src.endsWith(".svg");

  if (fill || aspect) {
    return (
      <div className={cn("relative overflow-hidden bg-panel", aspect, className)}>
        <Image src={src} alt={altText} fill sizes={sizes} priority={priority} unoptimized={isSvg} className="object-cover" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={altText}
      width={media?.width || 1600}
      height={media?.height || 1200}
      sizes={sizes}
      priority={priority}
      unoptimized={isSvg}
      className={cn("h-auto w-full", className)}
    />
  );
}
