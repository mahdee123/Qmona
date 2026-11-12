"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { Media, Service } from "@/types";
import { Accordion } from "@/components/ui/accordion";
import { IconPill } from "@/components/ui/pill";
import { EASE_REFERENCE } from "@/components/ui/motion";

export function ServicesAccordion({ services, fallbackImage, openFirst }: { services: Service[]; fallbackImage: Media | null; openFirst: boolean }) {
  const [active, setActive] = useState<string | null>(openFirst ? services[0]?.id ?? null : null);
  const current = services.find((s) => s.id === active);
  const img = current?.cover_image || fallbackImage;
  const src = img?.url || "/images/placeholder-service.png";

  return (
    <div className="grid gap-6 desktop:grid-cols-2 desktop:gap-6">
      <Accordion
        variant="pill"
        defaultOpen={active}
        onChange={setActive}
        items={services.map((s) => ({
          id: s.id,
          leading: <IconPill icon={s.icon_key} />,
          title: s.title,
          content: (
            <div className="space-y-4">
              <p>{s.short_description}</p>
              {s.capabilities.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {s.capabilities.slice(0, 6).map((c) => (
                    <li key={c.id} className="rounded-full bg-card px-3 py-1.5 text-[0.8125rem] text-ink">{c.title}</li>
                  ))}
                </ul>
              )}
              <Link href={`/services/${s.slug}`} className="group/l inline-flex items-center gap-2 font-medium text-ink">
                Explore {s.title}
                <ArrowRight className="h-4 w-4 transition-transform group-hover/l:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          ),
        }))}
      />
      <div className="hidden desktop:block">
        <div className="frame sticky top-28">
          <div className="relative aspect-[5/6] overflow-hidden rounded-[18px] bg-ink">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={src}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE_REFERENCE }}
                className="absolute inset-0"
              >
                <Image src={src} alt={img?.alt_text || ""} fill sizes="680px" className="object-cover" unoptimized={img?.mime_type === "image/svg+xml"} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
