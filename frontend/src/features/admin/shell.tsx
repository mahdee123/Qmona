"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award, BookOpen, Briefcase, Building2, CircleHelp, CreditCard, ExternalLink, FileText, History, Images, Inbox,
  KeyRound, LayoutDashboard, Layers, ListOrdered, LogOut, Menu, MessageSquareQuote, Navigation, PanelsTopLeft,
  Settings, SlidersHorizontal, Tags, UserRound, Users, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { MeContext, ToastContext, useApi, useToastState, type AdminUser } from "./hooks";
import { Loading } from "./ui";

type NavEntry = { href: string; label: string; icon: typeof Inbox; cap?: keyof AdminUser["capabilities"] };
const NAV: { group: string; items: NavEntry[] }[] = [
  { group: "", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Leads",
    items: [{ href: "/admin/inquiries", label: "Inquiries & support", icon: Inbox, cap: "manage_inquiries" }],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/pages", label: "Pages & sections", icon: PanelsTopLeft, cap: "manage_content" },
      { href: "/admin/projects", label: "Projects", icon: Briefcase, cap: "manage_content" },
      { href: "/admin/blog", label: "Blog posts", icon: BookOpen, cap: "manage_content" },
      { href: "/admin/content/services", label: "Services", icon: Layers, cap: "manage_content" },
      { href: "/admin/content/industries", label: "Industries", icon: Building2, cap: "manage_content" },
      { href: "/admin/content/process", label: "Process steps", icon: ListOrdered, cap: "manage_content" },
      { href: "/admin/content/faqs", label: "FAQs", icon: CircleHelp, cap: "manage_content" },
      { href: "/admin/content/testimonials", label: "Testimonials", icon: MessageSquareQuote, cap: "manage_content" },
      { href: "/admin/content/credibility", label: "Credibility", icon: Award, cap: "manage_content" },
      { href: "/admin/content/pricing", label: "Pricing", icon: CreditCard, cap: "manage_content" },
      { href: "/admin/content/team", label: "Team", icon: UserRound, cap: "manage_content" },
      { href: "/admin/media", label: "Media library", icon: Images, cap: "manage_content" },
    ],
  },
  {
    group: "Configuration",
    items: [
      { href: "/admin/taxonomies", label: "Taxonomies", icon: Tags, cap: "manage_content" },
      { href: "/admin/content/navigation", label: "Navigation", icon: Navigation, cap: "manage_content" },
      { href: "/admin/content/legal", label: "Legal pages", icon: FileText, cap: "manage_content" },
      { href: "/admin/content/form-options", label: "Form options", icon: SlidersHorizontal, cap: "manage_content" },
      { href: "/admin/settings", label: "Site settings", icon: Settings, cap: "manage_content" },
      { href: "/admin/users", label: "Users", icon: Users, cap: "manage_users" },
      { href: "/admin/audit", label: "Audit log", icon: History, cap: "view_audit_log" },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, error, loading } = useApi<AdminUser>("/auth/me/");
  const { toasts, push } = useToastState();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    if (error) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [error, pathname, router]);

  if (loading || !me) {
    return <div className="flex min-h-dvh items-center justify-center"><Loading label="Checking your session…" /></div>;
  }

  async function logout() {
    try {
      await api("/auth/logout/", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Link href="/admin" className="flex items-center gap-2 px-3">
        <Image src="/images/brand/logo-full.svg" alt="Qmona" width={121} height={31} unoptimized className="h-7 w-auto" />
        <span className="rounded-full bg-ink px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white">Admin</span>
      </Link>
      {NAV.map((g) => {
        const items = g.items.filter((i) => !i.cap || me.capabilities[i.cap]);
        if (!items.length) return null;
        return (
          <div key={g.group || "main"} className="space-y-1">
            {g.group && <p className="px-3 pb-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-subtle">{g.group}</p>}
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={isActive(i.href) ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-[12px] px-3 py-2 text-[0.875rem] transition", isActive(i.href) ? "bg-ink text-white" : "text-body hover:bg-card hover:text-ink")}
              >
                <i.icon className="h-4 w-4" aria-hidden="true" />
                {i.label}
              </Link>
            ))}
          </div>
        );
      })}
      <div className="mt-auto space-y-1 border-t border-line pt-4">
        <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-[12px] px-3 py-2 text-[0.875rem] text-body hover:bg-card">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> View website
        </a>
        <Link href="/admin/account" className="flex items-center gap-3 rounded-[12px] px-3 py-2 text-[0.875rem] text-body hover:bg-card">
          <KeyRound className="h-4 w-4" aria-hidden="true" /> {me.first_name || me.email}
          <span className="ml-auto text-[0.6875rem] text-muted">{me.role_display}</span>
        </Link>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-[0.875rem] text-body hover:bg-card">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <MeContext.Provider value={me}>
      <ToastContext.Provider value={push}>
        <div className="min-h-dvh desktop:grid desktop:grid-cols-[260px_1fr]">
          <aside className="sticky top-0 hidden h-dvh border-r border-line bg-panel/60 desktop:block">{sidebar}</aside>
          <div className="flex items-center justify-between border-b border-line bg-card px-4 py-3 desktop:hidden">
            <Image src="/images/brand/logo-full.svg" alt="Qmona" width={121} height={31} unoptimized className="h-7 w-auto" />
            <button type="button" aria-label="Open navigation" aria-expanded={navOpen} onClick={() => setNavOpen(true)} className="rounded-[10px] border border-line p-2"><Menu className="h-5 w-5" /></button>
          </div>
          {navOpen && (
            <div className="fixed inset-0 z-50 desktop:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
              <div className="absolute inset-0 bg-ink/40" onClick={() => setNavOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-72 bg-page shadow-xl">
                <button type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} className="absolute right-3 top-4 rounded-full p-1.5 hover:bg-card"><X className="h-5 w-5" /></button>
                {sidebar}
              </div>
            </div>
          )}
          <main id="admin-main" className="min-w-0 px-4 py-6 tablet:px-8 tablet:py-8">{children}</main>
        </div>
        <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
          {toasts.map((t) => (
            <div key={t.id} role="status" className={cn("pointer-events-auto rounded-[14px] px-4 py-3 text-[0.875rem] text-white shadow-lg", t.tone === "error" ? "bg-danger" : "bg-ink")}>
              {t.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </MeContext.Provider>
  );
}

export function RequireCap({ cap, children }: { cap: keyof AdminUser["capabilities"]; children: ReactNode }) {
  return (
    <MeContext.Consumer>
      {(me) =>
        me?.capabilities[cap] ? children : (
          <div className="rounded-[16px] border border-line bg-card p-8 text-center">
            <h1 className="text-[1.25rem] font-bold">No access</h1>
            <p className="mt-2 text-muted">Your role ({me?.role_display}) cannot open this section.</p>
          </div>
        )
      }
    </MeContext.Consumer>
  );
}
