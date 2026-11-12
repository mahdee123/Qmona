import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PostListItem } from "@/types";
import { MediaImage } from "@/components/ui/media-image";
import { Tag } from "@/components/ui/pill";
import { cn, formatDate } from "@/lib/utils";

function Meta({ post }: { post: PostListItem }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[0.9375rem] text-muted">
      <p className="flex items-center gap-2">
        {post.author && <span>{post.author.name}</span>}
        {post.author && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />}
        <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
      </p>
      <p className="shrink-0 text-[0.8125rem]">{post.reading_minutes} min</p>
    </div>
  );
}

function Tags({ post }: { post: PostListItem }) {
  const tags = [...post.categories.map((c) => ({ name: c.name, slug: c.slug })), ...post.tags].slice(0, 2);
  if (!tags.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((t) => <li key={t.slug}><Tag>{t.name}</Tag></li>)}
    </ul>
  );
}

function Arrow() {
  return (
    <span aria-hidden="true" className="inline-flex h-7 w-10 shrink-0 items-center justify-center rounded-full bg-card shadow-[var(--shadow-button)] transition-transform duration-300 group-hover/post:translate-x-1">
      <ArrowRight className="h-3.5 w-3.5" />
    </span>
  );
}

/** Large featured card (left column on the reference blog section). */
export function PostCardFeatured({ post, className }: { post: PostListItem; className?: string }) {
  return (
    <article className={cn("group/post relative flex flex-col gap-4", className)}>
      <Meta post={post} />
      <h3 className="text-[1.3125rem] font-medium leading-snug tracking-[-0.03em] text-ink">
        <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:z-10">{post.title}</Link>
      </h3>
      <div className="flex items-center justify-between gap-3">
        <Tags post={post} />
        <Arrow />
      </div>
      <div className="frame relative">
        <MediaImage media={post.cover_image} fallback="/images/placeholder-post.png" aspect="aspect-[5/4]" sizes="(min-width: 1200px) 680px, 100vw" />
        {post.is_featured && (
          <span className="absolute right-5 top-5 z-[1] rounded-full bg-accent px-3 py-1 text-[0.8125rem] font-medium text-white">Featured</span>
        )}
      </div>
    </article>
  );
}

/** Horizontal card: framed thumbnail + meta column. */
export function PostCardRow({ post, className }: { post: PostListItem; className?: string }) {
  return (
    <article className={cn("group/post relative grid gap-4 tablet:grid-cols-2 tablet:gap-6", className)}>
      <div className="frame">
        <MediaImage media={post.cover_image} fallback="/images/placeholder-post.png" aspect="aspect-[4/3]" sizes="(min-width: 810px) 340px, 100vw" />
      </div>
      <div className="flex flex-col gap-3 py-1">
        <Meta post={post} />
        <h3 className="text-[1.1875rem] font-medium leading-snug tracking-[-0.03em] text-ink">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:z-10">{post.title}</Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-3">
          <Tags post={post} />
          <Arrow />
        </div>
      </div>
    </article>
  );
}
