import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { ContentBlock } from "@/types";
import { cn, isExternal } from "@/lib/utils";

/**
 * Safe renderer for structured content. Stored content is never injected as
 * HTML: blocks map to React elements, and inline text supports only **bold**
 * and [label](url) with URLs already validated by the backend (re-checked here).
 */

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function safeHref(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^(https?:|mailto:|tel:|#)/.test(url)) return url;
  return null;
}

export function InlineText({ text }: { text: string }) {
  const parts = text.split(INLINE);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-bold text-ink">{part.slice(2, -2)}</strong>;
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          const href = safeHref(link[2]);
          if (!href) return <Fragment key={i}>{link[1]}</Fragment>;
          const cls = "font-medium text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-accent";
          return isExternal(href) ? (
            <a key={i} href={href} className={cls} target="_blank" rel="noopener noreferrer">{link[1]}</a>
          ) : (
            <Link key={i} href={href} className={cls}>{link[1]}</Link>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Plain multi-paragraph text (blank line = new paragraph). */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paras = (text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={cn("space-y-4", className)}>
      {paras.map((p, i) => (
        <p key={i}>
          {p.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              <InlineText text={line} />
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

export function BlockRenderer({ blocks, className }: { blocks: ContentBlock[]; className?: string }) {
  let headingIndex = 0;
  return (
    <div className={cn("space-y-5 text-[1.0625rem] leading-[1.7] text-body", className)}>
      {blocks.map((block, i): ReactNode => {
        switch (block.type) {
          case "heading": {
            headingIndex += 1;
            const Tag = (`h${block.level}` as "h2" | "h3" | "h4");
            return (
              <Tag
                key={i}
                id={`section-${headingIndex}`}
                className={cn(
                  "pt-6 font-medium tracking-[-0.03em] text-ink",
                  block.level === 2 ? "text-[1.625rem] leading-tight" : block.level === 3 ? "text-[1.3125rem]" : "text-lg",
                )}
              >
                {block.text}
              </Tag>
            );
          }
          case "paragraph":
            return <p key={i}><InlineText text={block.text} /></p>;
          case "list": {
            const ListTag = block.style === "ordered" ? "ol" : "ul";
            return (
              <ListTag key={i} className={cn("space-y-2 pl-6", block.style === "ordered" ? "list-decimal" : "list-disc marker:text-accent")}>
                {block.items.map((item, j) => <li key={j}><InlineText text={item} /></li>)}
              </ListTag>
            );
          }
          case "quote":
            return (
              <figure key={i} className="rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)]">
                <blockquote className="text-xl font-medium leading-snug tracking-[-0.02em] text-ink">
                  “<InlineText text={block.text} />”
                </blockquote>
                {block.cite && <figcaption className="t-small mt-3">— {block.cite}</figcaption>}
              </figure>
            );
          case "callout":
            return (
              <div key={i} className="rounded-[18px] border border-accent/20 bg-accent-soft px-5 py-4 text-ink">
                <InlineText text={block.text} />
              </div>
            );
          case "image":
            return (
              <figure key={i} className="space-y-3">
                <Image
                  src={block.url}
                  alt={block.alt || ""}
                  width={block.width || 1600}
                  height={block.height || 1000}
                  sizes="(min-width: 1200px) 860px, 100vw"
                  className="h-auto w-full rounded-[24px]"
                  unoptimized={block.url.endsWith(".svg")}
                />
                {block.caption && <figcaption className="t-small text-center">{block.caption}</figcaption>}
              </figure>
            );
          case "divider":
            return <hr key={i} className="dash-x border-0" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
