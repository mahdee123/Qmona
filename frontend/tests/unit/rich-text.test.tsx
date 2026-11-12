import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockRenderer, InlineText } from "@/components/ui/rich-text";
import type { ContentBlock } from "@/types";

describe("safe rich text", () => {
  it("escapes HTML in text instead of injecting it", () => {
    const html = renderToStaticMarkup(<InlineText text={'<script>alert(1)</script> **bold**'} />);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<strong");
  });
  it("drops javascript: links but keeps the label", () => {
    const html = renderToStaticMarkup(<InlineText text="[click](javascript:alert(1))" />);
    expect(html).not.toContain("href");
    expect(html).toContain("click");
  });
  it("renders safe internal and external links", () => {
    const html = renderToStaticMarkup(<InlineText text="[a](/contact) [b](https://example.com)" />);
    expect(html).toContain('href="/contact"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("renders blocks as elements, never raw HTML", () => {
    const blocks = [
      { type: "heading", level: 2, text: "Hi <b>x</b>" },
      { type: "list", style: "ordered", items: ["one", "two"] },
      { type: "html", html: "<img src=x onerror=alert(1)>" },
    ] as unknown as ContentBlock[];
    const html = renderToStaticMarkup(<BlockRenderer blocks={blocks} />);
    expect(html).toContain("<h2");
    expect(html).toContain("<ol");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<b>x</b>");
  });
});
