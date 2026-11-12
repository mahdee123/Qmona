"use client";

import Link from "next/link";
import { BookOpen, Briefcase, Inbox, PanelsTopLeft, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { errorMessage, useApi, useMe } from "@/features/admin/hooks";
import { Btn, Card, ErrorBox, Loading, PageHeader, StatusBadge } from "@/features/admin/ui";

interface Dashboard {
  inquiries?: {
    unread: number; new: number; open_contact: number; open_support: number; assigned_to_me: number;
    notification_failed: number; last_7_days: number;
    recent: { id: string; reference: string; inquiry_type: string; full_name: string; topic: string; subject: string; status: string; is_read: boolean; created_at: string }[];
  };
  content?: {
    projects: Record<string, number>; posts: Record<string, number>; services_active: number; industries_active: number;
    faqs_published: number; testimonials_pending: number; testimonials_published: number; pricing_published: number;
    claims_unverified: number; media_files: number;
    recently_updated: { type: string; id: string; title: string; status: string; updated_at: string }[];
  };
}

function Stat({ label, value, href, tone }: { label: string; value: number | string; href?: string; tone?: "accent" }) {
  const inner = (
    <div className="rounded-[18px] border border-line bg-card p-4 transition hover:border-ink/30">
      <p className="text-[0.8125rem] text-muted">{label}</p>
      <p className={`mt-1 text-[1.75rem] font-bold tracking-[-0.03em] ${tone === "accent" && Number(value) > 0 ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const me = useMe();
  const { data, loading, error, reload } = useApi<Dashboard>("/manage/dashboard/");
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={errorMessage(error)} onRetry={reload} />;
  const i = data?.inquiries;
  const c = data?.content;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${me?.first_name ? `, ${me.first_name}` : ""}`}
        description="Live figures from the database."
        actions={
          <>
            {me?.capabilities.manage_inquiries && <Btn href="/admin/inquiries"><Inbox className="h-4 w-4" /> Inquiries</Btn>}
            {me?.capabilities.manage_content && (
              <>
                <Btn href="/admin/projects/new"><Plus className="h-4 w-4" /> Project</Btn>
                <Btn href="/admin/blog/new"><Plus className="h-4 w-4" /> Post</Btn>
                <Btn href="/admin/pages/home" variant="primary"><PanelsTopLeft className="h-4 w-4" /> Edit homepage</Btn>
              </>
            )}
          </>
        }
      />

      {i && (
        <section className="space-y-4" aria-labelledby="dash-inquiries">
          <h2 id="dash-inquiries" className="text-[1.125rem] font-bold">Inquiries & support</h2>
          <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
            <Stat label="Unread" value={i.unread} href="/admin/inquiries?is_read=false" tone="accent" />
            <Stat label="New" value={i.new} href="/admin/inquiries?status=new" />
            <Stat label="Open project inquiries" value={i.open_contact} href="/admin/inquiries?inquiry_type=contact" />
            <Stat label="Open support requests" value={i.open_support} href="/admin/inquiries?inquiry_type=support" />
            <Stat label="Assigned to me" value={i.assigned_to_me} href="/admin/inquiries?assigned_to=me" />
            <Stat label="Notification failures" value={i.notification_failed} href="/admin/inquiries?notification_status=failed" tone="accent" />
          </div>
          <Card title="Recent submissions" actions={<Btn href="/admin/inquiries" variant="ghost">View all</Btn>}>
            {i.recent.length === 0 ? <p className="text-[0.875rem] text-muted">No submissions yet.</p> : (
              <ul className="divide-y divide-line">
                {i.recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/inquiries/${r.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-page/50">
                      {!r.is_read && <span className="h-2 w-2 rounded-full bg-accent" aria-label="Unread" />}
                      <span className="font-medium">{r.full_name}</span>
                      <span className="text-[0.8125rem] text-muted">{r.topic || r.subject}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <StatusBadge value={r.inquiry_type === "support" ? "support" : "project"} tone={r.inquiry_type === "support" ? "blue" : "gray"} />
                        <StatusBadge value={r.status} />
                        <span className="text-[0.8125rem] text-muted">{formatDate(r.created_at, { hour: "2-digit", minute: "2-digit" })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      {c && (
        <section className="space-y-4" aria-labelledby="dash-content">
          <h2 id="dash-content" className="text-[1.125rem] font-bold">Content</h2>
          <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
            <Stat label="Published projects" value={c.projects.Published || 0} href="/admin/projects" />
            <Stat label="Draft projects" value={c.projects.Draft || 0} href="/admin/projects" />
            <Stat label="Published posts" value={c.posts.published || 0} href="/admin/blog" />
            <Stat label="Draft posts" value={c.posts.draft || 0} href="/admin/blog" />
            <Stat label="Active services" value={c.services_active} href="/admin/content/services" />
            <Stat label="Media files" value={c.media_files} href="/admin/media" />
            <Stat label="Published FAQs" value={c.faqs_published} href="/admin/content/faqs" />
            <Stat label="Testimonials published" value={c.testimonials_published} href="/admin/content/testimonials" />
            <Stat label="Testimonials pending" value={c.testimonials_pending} href="/admin/content/testimonials" />
            <Stat label="Pricing plans live" value={c.pricing_published} href="/admin/content/pricing" />
            <Stat label="Unverified claims" value={c.claims_unverified} href="/admin/content/credibility" />
            <Stat label="Active industries" value={c.industries_active} href="/admin/content/industries" />
          </div>
          <Card title="Recently updated">
            {c.recently_updated.length === 0 ? <p className="text-[0.875rem] text-muted">No projects or posts yet.</p> : (
              <ul className="divide-y divide-line">
                {c.recently_updated.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((u) => (
                  <li key={u.type + u.id}>
                    <Link href={u.type === "project" ? `/admin/projects/${u.id}` : `/admin/blog/${u.id}`} className="flex items-center gap-3 py-3">
                      {u.type === "project" ? <Briefcase className="h-4 w-4 text-muted" /> : <BookOpen className="h-4 w-4 text-muted" />}
                      <span className="font-medium">{u.title}</span>
                      <span className="ml-auto flex items-center gap-2"><StatusBadge value={u.status} /><span className="text-[0.8125rem] text-muted">{formatDate(u.updated_at)}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
