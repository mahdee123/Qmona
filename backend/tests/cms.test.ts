import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Client, buildApp, loggedIn, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";

const app = buildApp();
const M = "/api/v1/manage";
let editor: Client;

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  editor = await loggedIn(app, "content_editor");
});

describe("site", () => {
  it("returns identity, navigation and availability flags that follow the published content", async () => {
    const first = (await request(app).get("/api/v1/site/")).body;
    expect(first.profile).toMatchObject({ agency_name: "Qmona Agency", accent: "red", animations_enabled: true });
    expect(first.availability).toEqual({ blog: false, pricing: false, testimonials: false, team: false });
    expect(first.navigation).toEqual({ header: [], footer_primary: [], footer_secondary: [], footer_legal: [] });

    await editor.patch(`${M}/site-profile/`).send({ tagline: "We build.", email: "hello@example.com", accent: "blue" });
    const parent = await editor.post(`${M}/navigation/`).send({ location: "header", label: "Services", url: "/services" });
    await editor.post(`${M}/navigation/`).send({ location: "header", label: "Design", url: "/services/design", parent: parent.body.id });
    await editor.post(`${M}/navigation/`).send({ location: "footer_legal", label: "Hidden", url: "/x", is_visible: false });
    await editor.post(`${M}/pricing/`).send({ name: "Starter", slug: "starter", is_published: true });
    await editor.post(`${M}/socials/`).send({ platform: "linkedin", url: "https://linkedin.com/company/qmona" });

    const site = (await request(app).get("/api/v1/site/")).body;
    expect(site.profile).toMatchObject({ tagline: "We build.", email: "hello@example.com", accent: "blue" });
    expect(site.navigation.header[0]).toMatchObject({ label: "Services", children: [{ label: "Design", url: "/services/design" }] });
    expect(site.navigation.footer_legal).toEqual([]);
    expect(site.availability.pricing).toBe(true);
    expect(site.socials).toHaveLength(1);
  });

  it("enforces navigation nesting rules and safe URLs", async () => {
    const a = await editor.post(`${M}/navigation/`).send({ location: "header", label: "A", url: "/a" });
    const b = await editor.post(`${M}/navigation/`).send({ location: "header", label: "B", url: "/b", parent: a.body.id });
    expect((await editor.post(`${M}/navigation/`).send({ location: "header", label: "C", url: "/c", parent: b.body.id })).status).toBe(400);
    expect((await editor.post(`${M}/navigation/`).send({ location: "footer_legal", label: "D", url: "/d", parent: a.body.id })).status).toBe(400);
    expect((await editor.patch(`${M}/navigation/${a.body.id}/`).send({ parent: a.body.id })).status).toBe(400);
    expect((await editor.post(`${M}/navigation/`).send({ location: "header", label: "E", url: "javascript:alert(1)" })).status).toBe(400);
  });

  it("only accepts PNG or SVG favicons", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    const media = await editor.post(`${M}/media/`).attach("file", png, "icon.jpg");
    const res = await editor.patch(`${M}/site-profile/`).send({ favicon: media.body.id });
    expect(res.status).toBe(400);
    expect(res.body.errors.favicon).toBeTruthy();
  });
});

describe("pages and sections", () => {
  async function page() {
    return (await editor.post(`${M}/pages/`).send({ slug: "home", title: "Home" })).body;
  }

  it("validates section content against its type and rejects unknown keys", async () => {
    const p = await page();
    const ok = await editor.post(`${M}/sections/`).send({
      page: p.id, section_type: "hero", headline: "Hello", content_data: { primary_cta: { label: "Start", url: "/contact" }, show_side_cards: true },
    });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ variant: "centered", animation_preset: "fade_up", animation_duration: "0.60", animation_delay: "0.00" });

    const unknown = await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "hero", content_data: { onclick: "x" } });
    expect(unknown.status).toBe(400);
    expect(unknown.body.errors.content_data[0]).toContain("unknown fields");
    const halfLink = await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "hero", content_data: { primary_cta: { label: "Only label" } } });
    expect(halfLink.status).toBe(400);
    const unsafe = await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "hero", content_data: { primary_cta: { label: "x", url: "javascript:alert(1)" } } });
    expect(unsafe.status).toBe(400);
    const badVariant = await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "hero", variant: "split" });
    expect(badVariant.body.errors.variant).toBeTruthy();
  });

  it("validates presets for styling and rejects roles a section does not render", async () => {
    const p = await page();
    const ok = await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "impact", style: { heading: { size: "3xl", weight: "bold" }, card: { radius: "xl" } } });
    expect(ok.status).toBe(201);
    expect(ok.body.style).toEqual({ heading: { size: "3xl", weight: "bold" }, card: { radius: "xl" } });
    const badRole = await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "contact", style: { button: { size: "lg" } } });
    expect(badRole.status).toBe(400);
    const badValue = await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "impact", style: { heading: { size: "gigantic" } } });
    expect(badValue.status).toBe(400);
    const patch = await editor.patch(`${M}/sections/${ok.body.id}/`).send({ headline: "Changed" });
    expect(patch.body.style.heading.size).toBe("3xl");
  });

  it("serves only active sections, in order, with media resolved", async () => {
    const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#000" } }).png().toBuffer();
    const media = await editor.post(`${M}/media/`).attach("file", png, "side.png").field("alt_text", "Side");
    const p = await page();
    await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "services", headline: "Second", order: 2, content_data: { image: media.body.id } });
    await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "faq", headline: "First", order: 1 });
    await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "blog", headline: "Off", order: 3, is_active: false });

    const res = await request(app).get("/api/v1/pages/home/");
    expect(res.status).toBe(200);
    expect(res.body.sections.map((s: { headline: string }) => s.headline)).toEqual(["First", "Second"]);
    expect(res.body.sections[1].content.image).toMatchObject({ id: media.body.id, alt_text: "Side", width: 30, height: 20 });
    expect(res.body.sections[0].animation).toEqual({ enabled: true, preset: "fade_up", duration: 0.6, delay: 0 });

    // The media is now in use and cannot be deleted.
    expect((await editor.delete(`${M}/media/${media.body.id}/`)).status).toBe(409);

    await editor.patch(`${M}/pages/home/`).send({ is_published: false });
    expect((await request(app).get("/api/v1/pages/home/")).status).toBe(404);
    expect((await editor.get(`${M}/preview/page/home/`)).body._status).toBe("draft");
  });

  it("filters sections by page slug and removes them with their page", async () => {
    const p = await page();
    await editor.post(`${M}/sections/`).send({ page: p.id, section_type: "faq" });
    expect((await editor.get(`${M}/sections/?page_slug=home`)).body).toHaveLength(1);
    expect((await editor.get(`${M}/sections/?page_slug=other`)).body).toHaveLength(0);
    expect((await editor.delete(`${M}/pages/home/`)).status).toBe(204);
    expect((await editor.get(`${M}/sections/`)).body).toHaveLength(0);
  });

  it("describes the available section types for the admin form builder", async () => {
    const res = await editor.get(`${M}/section-schemas/`);
    expect(res.body.section_types).toHaveLength(19);
    expect(res.body.schemas.hero.variants).toEqual(["centered"]);
    expect(res.body.style_schema.options.size).toContain("2xl");
  });
});

describe("evidence rules", () => {
  it("hides testimonials until they are verified AND published", async () => {
    const unverified = await editor.post(`${M}/testimonials/`).send({ client_name: "Ann", content: "Great.", is_published: true });
    expect(unverified.status).toBe(400);
    expect(unverified.body.errors.is_published).toBeTruthy();

    const draft = await editor.post(`${M}/testimonials/`).send({ client_name: "Ann", content: "Great.", evidence_note: "Email from client" });
    expect((await request(app).get("/api/v1/testimonials/")).body).toEqual([]);
    const published = await editor.patch(`${M}/testimonials/${draft.body.id}/`).send({ is_verified: true, is_published: true });
    expect(published.status).toBe(200);
    const list = await request(app).get("/api/v1/testimonials/");
    expect(list.body).toHaveLength(1);
    // The internal evidence note is never public.
    expect(JSON.stringify(list.body)).not.toContain("Email from client");
    expect((await request(app).get("/api/v1/site/")).body.availability.testimonials).toBe(true);
  });

  it("only publishes verified statistics, awards and client logos", async () => {
    const claim = await editor.post(`${M}/credibility/`).send({ kind: "stat", title: "120+ clients", value: "120+", is_published: true });
    expect(claim.status).toBe(400);
    await editor.post(`${M}/credibility/`).send({ kind: "capability", title: "Six services", value: "6", is_published: true });
    const stat = await editor.post(`${M}/credibility/`).send({ kind: "stat", title: "Verified stat", value: "5", is_verified: true, is_published: true, evidence_note: "Internal proof" });
    expect(stat.status).toBe(201);
    await editor.post(`${M}/credibility/`).send({ kind: "award", title: "Draft award" });

    const list = await request(app).get("/api/v1/credibility/");
    expect(list.body.map((c: { title: string }) => c.title).sort()).toEqual(["Six services", "Verified stat"]);
    expect(JSON.stringify(list.body)).not.toContain("Internal proof");
  });

  it("keeps pricing, team and legal drafts private", async () => {
    await editor.post(`${M}/pricing/`).send({ name: "Draft plan", slug: "draft", price_amount: "99.5" });
    await editor.post(`${M}/pricing/`).send({ name: "Live plan", slug: "live", price_amount: 120, is_published: true, features: ["A", "B"] });
    const plans = (await request(app).get("/api/v1/pricing/")).body;
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ slug: "live", price_amount: "120.00", features: ["A", "B"] });

    await editor.post(`${M}/team/`).send({ full_name: "Hidden", role_title: "CEO" });
    expect((await request(app).get("/api/v1/team/")).body).toEqual([]);

    await editor.post(`${M}/legal/`).send({ slug: "privacy", title: "Privacy", body: [{ type: "paragraph", text: "We keep your data safe." }] });
    expect((await request(app).get("/api/v1/legal/privacy/")).status).toBe(404);
    const legal = (await editor.get(`${M}/legal/`)).body[0];
    await editor.patch(`${M}/legal/${legal.id}/`).send({ status: "published", last_reviewed: "2026-11-01" });
    const page = await request(app).get("/api/v1/legal/privacy/");
    expect(page.body).toMatchObject({ slug: "privacy", last_reviewed: "2026-11-01" });
    expect(page.body.body[0].text).toBe("We keep your data safe.");
  });
});

describe("form options", () => {
  it("publishes the managed choices and taxonomies for the contact form", async () => {
    await editor.post(`${M}/form-options/`).send({ kind: "inquiry_topic", value: "new-project", label: "New project", order: 1 });
    await editor.post(`${M}/form-options/`).send({ kind: "inquiry_topic", value: "hidden", label: "Hidden", is_active: false });
    await editor.post(`${M}/services/`).send({ title: "Web", slug: "web", short_description: "x" });
    await editor.post(`${M}/industries/`).send({ name: "Retail", slug: "retail" });
    const res = (await request(app).get("/api/v1/forms/options/")).body;
    expect(res.options.inquiry_topic).toEqual([{ value: "new-project", label: "New project" }]);
    expect(res.options.budget_range).toEqual([]);
    expect(res.services).toEqual([{ slug: "web", title: "Web" }]);
    expect(res.industries).toEqual([{ slug: "retail", name: "Retail" }]);
    expect((await editor.post(`${M}/form-options/`).send({ kind: "inquiry_topic", value: "new-project", label: "Dup" })).status).toBe(400);
  });
});
