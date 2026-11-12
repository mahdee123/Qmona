import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Client, buildApp, loggedIn, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";

const app = buildApp();
let editor: Client;
const M = "/api/v1/manage";

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  editor = await loggedIn(app, "content_editor");
});

const service = (extra: Record<string, unknown> = {}) => ({ title: "UI/UX Design", slug: "ui-ux", short_description: "Interfaces.", ...extra });

describe("services", () => {
  it("creates a service with ordered capabilities and returns the management shape", async () => {
    const res = await editor.post(`${M}/services/`).send(service({ capability_titles: ["Research", "Wireframes"], deliverables: ["Figma files"], icon_key: "palette" }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "UI/UX Design", icon_key: "palette", is_active: true, is_featured: true, category_name: null, deliverables: ["Figma files"] });
    expect(res.body.capabilities.map((c: { title: string }) => c.title)).toEqual(["Research", "Wireframes"]);
    expect(res.body.cover_image_detail).toBeNull();
  });

  it("a partial update changes only the fields that were sent", async () => {
    const created = await editor.post(`${M}/services/`).send(service({ capability_titles: ["A"], deliverables: ["D"], tagline: "Keep me", is_featured: false, order: 7 }));
    const res = await editor.patch(`${M}/services/${created.body.id}/`).send({ title: "Renamed" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: "Renamed", tagline: "Keep me", is_featured: false, order: 7, deliverables: ["D"] });
    expect(res.body.capabilities).toHaveLength(1);
  });

  it("validates input with field errors", async () => {
    const res = await editor.post(`${M}/services/`).send({ title: "", slug: "bad slug!", icon_key: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("validation_error");
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(["title", "slug", "icon_key", "short_description"]));
  });

  it("rejects a duplicate slug", async () => {
    await editor.post(`${M}/services/`).send(service());
    const res = await editor.post(`${M}/services/`).send(service({ title: "Other" }));
    expect(res.status).toBe(400);
    expect(res.body.errors.slug).toBeTruthy();
  });

  it("shows only active services publicly, hides inactive ones, and supports ?featured", async () => {
    await editor.post(`${M}/services/`).send(service({ slug: "on", title: "On", is_featured: true, capability_titles: ["X"] }));
    await editor.post(`${M}/services/`).send(service({ slug: "off", title: "Off", is_active: false }));
    await editor.post(`${M}/services/`).send(service({ slug: "plain", title: "Plain", is_featured: false }));

    const list = await request(app).get("/api/v1/services/");
    expect(list.status).toBe(200);
    expect(list.body.map((s: { slug: string }) => s.slug).sort()).toEqual(["on", "plain"]);
    const featured = await request(app).get("/api/v1/services/?featured=true");
    expect(featured.body.map((s: { slug: string }) => s.slug)).toEqual(["on"]);

    const detail = await request(app).get("/api/v1/services/on/");
    expect(detail.body.capabilities[0].title).toBe("X");
    expect(detail.body).toHaveProperty("full_content");
    expect((await request(app).get("/api/v1/services/off/")).status).toBe(404);
  });

  it("reorders and deletes", async () => {
    const a = await editor.post(`${M}/services/`).send(service({ slug: "a", title: "A" }));
    const b = await editor.post(`${M}/services/`).send(service({ slug: "b", title: "B" }));
    const reorder = await editor.post(`${M}/services/reorder/`).send({ ids: [b.body.id, a.body.id] });
    expect(reorder.status).toBe(200);
    const list = await editor.get(`${M}/services/`);
    expect(list.body.results.map((s: { slug: string }) => s.slug)).toEqual(["b", "a"]);
    expect((await editor.delete(`${M}/services/${a.body.id}/`)).status).toBe(204);
    expect((await editor.get(`${M}/services/${a.body.id}/`)).status).toBe(404);
  });

  it("is closed to anonymous visitors and to other roles", async () => {
    expect((await request(app).get(`${M}/services/`)).status).toBe(403);
    const inquiry = await loggedIn(app, "inquiry_manager");
    expect((await inquiry.get(`${M}/services/`)).status).toBe(403);
    expect((await inquiry.post(`${M}/services/`).send(service())).status).toBe(403);
  });

  it("requires a CSRF token for writes", async () => {
    const res = await editor.agent.post(`${M}/services/`).send(service());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("csrf_failed");
  });
});

describe("projects", () => {
  const project = (extra: Record<string, unknown> = {}) => ({ title: "Project One", slug: "project-one", summary: "A summary.", ...extra });

  it("keeps drafts private and masks confidential details on published projects", async () => {
    const svc = await editor.post(`${M}/services/`).send(service());
    const industry = await editor.post(`${M}/industries/`).send({ name: "FinTech", slug: "fintech" });
    const res = await editor.post(`${M}/projects/`).send(
      project({
        services: [svc.body.id], industries: [industry.body.id], client_name: "Acme Ltd", is_client_name_visible: false,
        budget_min: "1000", budget_max: 5000, is_budget_visible: false, live_url: "https://example.com", is_external_link_visible: false,
        key_features: [{ title: "Fast", description: "Very" }], verified_results: [{ value: "2x", label: "Faster" }],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ publication_status: "Draft", budget_min: "1000.00", budget_max: "5000.00", inquiries_count: 0 });

    // Draft: invisible to the public.
    expect((await request(app).get("/api/v1/projects/")).body.count).toBe(0);
    expect((await request(app).get("/api/v1/projects/project-one/")).status).toBe(404);

    const published = await editor.patch(`${M}/projects/${res.body.id}/`).send({ publication_status: "Published" });
    expect(published.body.published_at).toBeTruthy();

    const list = await request(app).get("/api/v1/projects/");
    expect(list.body.count).toBe(1);
    expect(list.body.results[0]).toMatchObject({ client_name: "Confidential client", services: [{ name: "UI/UX Design", slug: "ui-ux" }], industries: [{ name: "FinTech", slug: "fintech" }] });

    const detail = await request(app).get("/api/v1/projects/project-one/");
    expect(detail.body.budget).toBeNull();
    expect(detail.body.external_links).toBeNull();
    expect(detail.body.client_logo).toBeNull();
    expect(JSON.stringify(detail.body)).not.toContain("Acme");
    expect(detail.body.key_features).toEqual([{ title: "Fast", description: "Very" }]);
  });

  it("reveals budget and links only when explicitly allowed, and filters by service", async () => {
    const svc = await editor.post(`${M}/services/`).send(service());
    await editor.post(`${M}/projects/`).send(project({
      publication_status: "Published", services: [svc.body.id], client_name: "Acme", is_client_name_visible: true,
      budget_min: 1000, budget_max: 2000, currency: "EUR", is_budget_visible: true, live_url: "https://example.com", is_external_link_visible: true,
    }));
    await editor.post(`${M}/projects/`).send(project({ title: "Other", slug: "other", publication_status: "Published" }));

    const detail = await request(app).get("/api/v1/projects/project-one/");
    expect(detail.body.budget).toEqual({ min: "1000.00", max: "2000.00", currency: "EUR" });
    expect(detail.body.external_links).toEqual({ live_url: "https://example.com", repo_url: null });
    expect(detail.body.client_name).toBe("Acme");

    const filtered = await request(app).get("/api/v1/projects/?services=ui-ux");
    expect(filtered.body.results.map((p: { slug: string }) => p.slug)).toEqual(["project-one"]);
    const searched = await request(app).get("/api/v1/projects/?search=other");
    expect(searched.body.results.map((p: { slug: string }) => p.slug)).toEqual(["other"]);
    const related = await request(app).get("/api/v1/projects/project-one/related/");
    expect(related.body.map((p: { slug: string }) => p.slug)).toEqual(["other"]);
  });

  it("rejects an inverted budget and unsafe URLs", async () => {
    const res = await editor.post(`${M}/projects/`).send(project({ budget_min: 10, budget_max: 5, live_url: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    expect(res.body.errors.live_url).toBeTruthy();
    const inverted = await editor.post(`${M}/projects/`).send(project({ budget_min: 10, budget_max: 5 }));
    expect(inverted.body.errors.budget_max).toBeTruthy();
  });

  it("paginates the public list with the standard envelope", async () => {
    for (let i = 0; i < 3; i++) await editor.post(`${M}/projects/`).send(project({ title: `P${i}`, slug: `p${i}`, publication_status: "Published", order: i }));
    const res = await request(app).get("/api/v1/projects/?page_size=2");
    expect(res.body).toMatchObject({ count: 3, total_pages: 2, page: 1, page_size: 2 });
    expect(res.body.next).toContain("page=2");
    expect(res.body.results).toHaveLength(2);
    expect((await request(app).get("/api/v1/projects/?page_size=2&page=3")).status).toBe(404);
  });

  it("removes a deleted taxonomy entry from projects", async () => {
    const tech = await editor.post(`${M}/technologies/`).send({ name: "Next.js", slug: "nextjs" });
    const created = await editor.post(`${M}/projects/`).send(project({ technologies: [tech.body.id] }));
    expect(created.body.technologies).toEqual([tech.body.id]);
    await editor.delete(`${M}/technologies/${tech.body.id}/`);
    const after = await editor.get(`${M}/projects/${created.body.id}/`);
    expect(after.body.technologies).toEqual([]);
  });
});

describe("blog", () => {
  const post = (extra: Record<string, unknown> = {}) => ({ title: "Hello", slug: "hello", excerpt: "Short.", body: [{ type: "paragraph", text: "word ".repeat(450) }], ...extra });

  it("computes reading time, stamps the publish date and hides drafts and scheduled posts", async () => {
    const draft = await editor.post(`${M}/blog/posts/`).send(post());
    expect(draft.body).toMatchObject({ status: "draft", reading_minutes: 3, published_at: null });
    expect((await request(app).get("/api/v1/blog/posts/")).body.count).toBe(0);

    const live = await editor.patch(`${M}/blog/posts/${draft.body.id}/`).send({ status: "published" });
    expect(live.body.published_at).toBeTruthy();
    expect((await request(app).get("/api/v1/blog/posts/")).body.count).toBe(1);

    const future = new Date(Date.now() + 86_400_000).toISOString();
    await editor.post(`${M}/blog/posts/`).send(post({ title: "Later", slug: "later", status: "published", published_at: future }));
    expect((await request(app).get("/api/v1/blog/posts/")).body.count).toBe(1);
    expect((await request(app).get("/api/v1/blog/posts/later/")).status).toBe(404);
  });

  it("validates content blocks and links", async () => {
    const bad = await editor.post(`${M}/blog/posts/`).send(post({ body: [{ type: "paragraph", text: "[x](javascript:alert(1))" }] }));
    expect(bad.status).toBe(400);
    expect(bad.body.errors.body[0]).toContain("Unsafe link");
    const unknown = await editor.post(`${M}/blog/posts/`).send(post({ slug: "u", body: [{ type: "html", text: "<b>x</b>" }] }));
    expect(unknown.status).toBe(400);
    const ok = await editor.post(`${M}/blog/posts/`).send(post({ slug: "ok", body: [{ type: "heading", level: 2, text: "Hi" }, { type: "list", style: "ordered", items: ["a", "b"] }, { type: "divider" }] }));
    expect(ok.status).toBe(201);
  });

  it("serves the public detail with its author, categories and related posts", async () => {
    const author = await editor.post(`${M}/blog/authors/`).send({ name: "Sam", slug: "sam" });
    const category = await editor.post(`${M}/blog/categories/`).send({ name: "News", slug: "news" });
    await editor.post(`${M}/blog/posts/`).send(post({ status: "published", author: author.body.id, categories: [category.body.id] }));
    await editor.post(`${M}/blog/posts/`).send(post({ title: "Second", slug: "second", status: "published", categories: [category.body.id] }));

    const detail = await request(app).get("/api/v1/blog/posts/hello/");
    expect(detail.body).toMatchObject({ slug: "hello", author: { name: "Sam" }, categories: [{ name: "News", slug: "news" }] });
    expect(detail.body.body[0].type).toBe("paragraph");
    const related = await request(app).get("/api/v1/blog/posts/hello/related/");
    expect(related.body.map((p: { slug: string }) => p.slug)).toEqual(["second"]);
    const cats = await request(app).get("/api/v1/blog/categories/");
    expect(cats.body).toEqual([{ name: "News", slug: "news", description: "" }]);
    const byCategory = await request(app).get("/api/v1/blog/posts/?category=news");
    expect(byCategory.body.count).toBe(2);
  });
});
