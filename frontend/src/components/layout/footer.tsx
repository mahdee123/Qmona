import Link from "next/link";
import type { NavItem, SiteData } from "@/types";
import { SocialIcon } from "@/components/ui/social-icon";
import { Badge } from "@/components/ui/pill";
import { isExternal } from "@/lib/utils";
import { Logo } from "./logo";

function FooterLink({ item }: { item: NavItem }) {
  const cls = "inline-flex items-center gap-2 text-[0.9375rem] text-body transition-colors hover:text-ink";
  const inner = (
    <>
      {item.label}
      {item.badge && <Badge>{item.badge}</Badge>}
    </>
  );
  return isExternal(item.url) || item.open_in_new_tab ? (
    <a href={item.url} className={cls} target="_blank" rel="noopener noreferrer">{inner}</a>
  ) : (
    <Link href={item.url} className={cls}>{inner}</Link>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-medium tracking-[-0.02em] text-ink">{title}</h2>
      <ul className="mt-5 flex flex-col gap-3">{children}</ul>
    </div>
  );
}

export function Footer({ site }: { site: SiteData }) {
  const { profile, navigation, socials, legal_pages } = site;
  const year = new Date().getFullYear();
  const legal = navigation.footer_legal.length
    ? navigation.footer_legal
    : legal_pages.map((p) => ({ id: p.slug, label: p.title, url: `/${p.slug}`, description: "", icon_key: "", badge: "", open_in_new_tab: false, is_cta: false, children: [] }));

  return (
    <footer className="container-q pb-10 pt-6">
      <div className="rounded-[32px] px-2 pt-10 tablet:px-8">
        <div className="grid gap-12 desktop:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm space-y-5">
            <Logo profile={profile} />
            {profile.description && <p className="t-body">{profile.description}</p>}
            <dl className="space-y-3 text-[0.9375rem]">
              {profile.email && (
                <div>
                  <dt className="sr-only">Email</dt>
                  <dd><a className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent" href={`mailto:${profile.email}`}>{profile.email}</a></dd>
                </div>
              )}
              {profile.phone && (
                <div>
                  <dt className="sr-only">Phone</dt>
                  <dd><a className="text-ink hover:text-accent" href={`tel:${profile.phone.replace(/\s+/g, "")}`}>{profile.phone}</a></dd>
                </div>
              )}
              {profile.address && (
                <div>
                  <dt className="sr-only">Address</dt>
                  <dd className="not-italic text-body">{profile.address}</dd>
                </div>
              )}
            </dl>
          </div>

          {navigation.footer_primary.length > 0 && (
            <Column title="Company">
              {navigation.footer_primary.map((item) => <li key={item.id}><FooterLink item={item} /></li>)}
            </Column>
          )}
          {navigation.footer_secondary.length > 0 && (
            <Column title="Services">
              {navigation.footer_secondary.map((item) => <li key={item.id}><FooterLink item={item} /></li>)}
            </Column>
          )}
          {socials.length > 0 && (
            <Column title="Socials">
              {socials.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 text-[0.9375rem] text-body hover:text-ink">
                    <SocialIcon platform={s.platform} />
                    {s.label || s.platform}
                  </a>
                </li>
              ))}
            </Column>
          )}
        </div>

        <div className="dash-x mt-14" />
        <div className="flex flex-col gap-4 py-6 text-[0.9375rem] text-body tablet:flex-row tablet:items-center tablet:justify-between">
          <p>
            © {year} {profile.agency_name}
            {profile.city ? ` · ${profile.city}, ${profile.country}` : ""}
            {profile.footer_note ? ` · ${profile.footer_note}` : ""}
          </p>
          {legal.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {legal.map((item) => <li key={item.id}><FooterLink item={item} /></li>)}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
