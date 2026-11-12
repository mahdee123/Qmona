import Image from "next/image";
import type { PostDetail, PostListItem } from "@/types";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/ui/motion";
import { BlockRenderer } from "@/components/ui/rich-text";
import { SectionHeading } from "@/components/ui/section-heading";
import { SocialIcon } from "@/components/ui/social-icon";
import { BackLink } from "@/components/sections/back-link";
import { SectionShell } from "@/components/sections/shell";
import { absoluteUrl, formatDate } from "@/lib/utils";
import { PostCardRow } from "./post-card";

export function PostDetailView({ post, related }: { post: PostDetail; related: PostListItem[] }) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  const share = [
    { platform: "x", label: "Share on X", href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}` },
    { platform: "linkedin", label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  ];
  return (
    <article>
      <header className="container-q pb-10 pt-12 tablet:pt-20">
        <Reveal immediate y={20} className="flex flex-col gap-6">
          <BackLink href="/blog">Go to Blog</BackLink>
          <p className="pt-6 text-[0.9375rem] text-muted">
            Read in <span className="text-ink">{post.reading_minutes} min</span>
          </p>
          <h1 className="max-w-4xl text-[2rem] font-bold leading-[1.1] tracking-[-0.045em] tablet:text-[2.5rem]">{post.title}</h1>
          <p className="t-lead max-w-3xl">{post.excerpt}</p>
          <div className="flex flex-col gap-6 pt-2 desktop:flex-row desktop:items-center desktop:justify-between">
            <div className="flex flex-wrap items-center gap-8">
              {post.author && (
                <div className="flex items-center gap-3">
                  {post.author.avatar ? (
                    <Image src={post.author.avatar.url} alt="" width={44} height={44} className="h-11 w-11 rounded-[12px] object-cover shadow-[var(--shadow-card)]" />
                  ) : (
                    <span aria-hidden="true" className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-card font-bold shadow-[var(--shadow-card)]">{post.author.name.slice(0, 1)}</span>
                  )}
                  <div>
                    <p className="text-[0.8125rem] text-muted">Author</p>
                    <p className="text-[0.9375rem] text-ink">{post.author.name}</p>
                  </div>
                </div>
              )}
              <ul className="flex gap-2" aria-label="Share">
                {share.map((s) => (
                  <li key={s.platform}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="inline-flex h-11 w-[4.5rem] items-center justify-center rounded-full bg-card text-ink shadow-[var(--shadow-button)] hover:-translate-y-px">
                      <SocialIcon platform={s.platform} className="h-[18px] w-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="flex gap-8">
              <div>
                <dt className="text-[0.8125rem] text-muted">Published on</dt>
                <dd className="text-[1rem] text-ink"><time dateTime={post.published_at}>{formatDate(post.published_at)}</time></dd>
              </div>
              {post.categories.length > 0 && (
                <div>
                  <dt className="text-[0.8125rem] text-muted">Blog Categories</dt>
                  <dd className="flex gap-4 text-[1rem] text-ink">{post.categories.map((c) => <span key={c.slug}>{c.name}</span>)}</dd>
                </div>
              )}
            </dl>
          </div>
        </Reveal>
        {post.cover_image && (
          <Reveal delay={0.15} className="mt-10 overflow-hidden rounded-[32px]">
            <MediaImage media={post.cover_image} aspect="aspect-[16/9]" sizes="100vw" priority />
          </Reveal>
        )}
      </header>

      <div className="container-q pb-16">
        <div className="max-w-[54rem]">
          <BlockRenderer blocks={post.body} />
          {post.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => <li key={t.slug} className="rounded-full bg-card px-4 py-2 text-[0.8125rem] shadow-[var(--shadow-button)]">#{t.name}</li>)}
            </ul>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <SectionShell>
          <SectionHeading align="left" label="Blog" headline={"More insights\nfrom our team."} />
          <div className="mt-12 grid gap-10 desktop:grid-cols-2">
            {related.map((p) => <PostCardRow key={p.id} post={p} />)}
          </div>
        </SectionShell>
      )}
    </article>
  );
}
