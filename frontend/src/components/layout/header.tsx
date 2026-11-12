"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { NavItem } from "@/types";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/pill";
import { EASE_REFERENCE } from "@/components/ui/motion";
import { cn, isExternal } from "@/lib/utils";

const FALLBACK_ICONS: Record<string, string> = {
  services: "layers", work: "briefcase", industries: "building", about: "users", blog: "message",
  support: "headset", contact: "mail",
};

function iconFor(item: NavItem) {
  return item.icon_key || FALLBACK_ICONS[item.label.toLowerCase()] || "compass";
}

function NavAnchor({ item, className, children, onClick }: { item: NavItem; className?: string; children: ReactNode; onClick?: () => void }) {
  const external = item.open_in_new_tab || isExternal(item.url);
  if (external) {
    return (
      <a href={item.url} className={className} target={item.open_in_new_tab ? "_blank" : undefined} rel="noopener noreferrer" onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link href={item.url} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

function DesktopDropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[1.0625rem] transition-colors", active ? "text-ink" : "text-body hover:text-ink")}
      >
        {item.label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: EASE_REFERENCE }}
            className="absolute left-0 top-full mt-3 w-72 rounded-[24px] bg-card p-2 shadow-[var(--shadow-soft)]"
          >
            {[{ ...item, children: [], label: `All ${item.label.toLowerCase()}`, description: "" }, ...item.children].map((child) => (
              <li key={child.id + child.label}>
                <NavAnchor item={child} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-[18px] px-3 py-2.5 hover:bg-page">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-page text-ink">
                    <Icon name={iconFor(child)} className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[0.9375rem] font-medium text-ink">{child.label}</span>
                    {child.description && <span className="block text-[0.8125rem] text-muted">{child.description}</span>}
                  </span>
                </NavAnchor>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Header({ logo, items }: { logo: ReactNode; items: NavItem[] }) {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const links = items.filter((i) => !i.is_cta);
  const cta = items.find((i) => i.is_cta);

  // Reference behaviour: header hides when scrolling down, reappears when scrolling up.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 8);
    if (menuOpen) return;
    if (y > 160 && y > prev + 4) setHidden(true);
    else if (y < prev - 4 || y < 160) setHidden(false);
  });

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = menuRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
      if (e.key === "Tab" && menuRef.current) {
        const focusables = Array.from(menuRef.current.querySelectorAll<HTMLElement>("a,button"));
        const all = [toggleRef.current!, ...focusables];
        const idx = all.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && idx <= 0) {
          e.preventDefault();
          all[all.length - 1].focus();
        } else if (!e.shiftKey && idx === all.length - 1) {
          e.preventDefault();
          all[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  return (
    <>
      {/* Soft top fade so content scrolls under the floating header (reference: fixed 140px overlay) */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-30 h-28 bg-gradient-to-b from-page via-page/70 to-transparent transition-opacity duration-500",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
      <motion.header
        initial={false}
        animate={{ y: hidden ? -96 : 0 }}
        transition={{ duration: 0.45, ease: EASE_REFERENCE }}
        className="fixed inset-x-0 top-0 z-40"
      >
        <div className="container-q flex h-[84px] items-center justify-between gap-6">
          {logo}

          {/* Desktop pill navigation */}
          <nav aria-label="Main" className="hidden desktop:block">
            <div className="flex items-center gap-2 rounded-full bg-card/80 p-1.5 pl-4 shadow-[var(--shadow-card)] ring-1 ring-white backdrop-blur-xl">
              <ul className="flex items-center gap-1">
                {links.map((item) =>
                  item.children.length ? (
                    <DesktopDropdown key={item.id} item={item} active={isActive(item.url)} />
                  ) : (
                    <li key={item.id}>
                      <NavAnchor
                        item={item}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[1.0625rem] transition-colors",
                          isActive(item.url) ? "text-ink" : "text-body hover:text-ink",
                        )}
                      >
                        {item.label}
                        {item.badge && <Badge>{item.badge}</Badge>}
                      </NavAnchor>
                    </li>
                  ),
                )}
              </ul>
              {cta && (
                <NavAnchor
                  item={cta}
                  className="group/cta ml-2 inline-flex h-11 items-center gap-3 rounded-full bg-gradient-to-b from-accent-light to-accent pl-5 pr-1.5 text-[0.9375rem] font-medium text-white shadow-[var(--shadow-accent)]"
                >
                  {cta.label}
                  <span className="inline-flex h-8 w-10 items-center justify-center rounded-full bg-white text-ink transition-transform group-hover/cta:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </NavAnchor>
              )}
            </div>
          </nav>

          {/* Mobile / tablet toggle */}
          <button
            ref={toggleRef}
            type="button"
            className="relative inline-flex h-12 w-14 items-center justify-center rounded-[18px] bg-panel ring-4 ring-white desktop:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          >
            <span aria-hidden="true" className="relative block h-3 w-5">
              <span className={cn("absolute left-0 h-[2px] w-5 rounded bg-ink transition-all duration-300", menuOpen ? "top-[5px]" : "top-0")} />
              <span className={cn("absolute left-0 h-[2px] rounded bg-ink transition-all duration-300", menuOpen ? "top-[5px] w-5" : "top-[10px] w-3.5")} />
            </span>
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_REFERENCE }}
              className="container-q desktop:hidden"
            >
              <nav aria-label="Mobile" className="rounded-[28px] bg-card p-3 shadow-[var(--shadow-soft)]">
                <ul className="flex flex-col">
                  {links.flatMap((item) => [item, ...item.children]).map((item) => (
                    <li key={item.id}>
                      <NavAnchor item={item} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-[18px] px-3 py-3 text-[1.0625rem]", isActive(item.url) ? "text-ink" : "text-body")}>
                        <Icon name={iconFor(item)} className="h-5 w-5 text-muted" />
                        <span>{item.label}</span>
                        {item.badge && <Badge>{item.badge}</Badge>}
                      </NavAnchor>
                    </li>
                  ))}
                </ul>
                {cta && (
                  <NavAnchor
                    item={cta}
                    onClick={() => setMenuOpen(false)}
                    className="mt-4 flex h-14 items-center justify-between rounded-full bg-gradient-to-b from-accent-light to-accent pl-6 pr-2 text-[1.0625rem] font-medium text-white shadow-[var(--shadow-accent)]"
                  >
                    {cta.label}
                    <span className="inline-flex h-10 w-14 items-center justify-center rounded-full bg-white text-ink">
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </NavAnchor>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            className="fixed inset-0 z-30 bg-ink/15 backdrop-blur-[6px] desktop:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}
