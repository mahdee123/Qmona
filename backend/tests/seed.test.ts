import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildApp, loggedIn, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";
import { runSeed } from "../scripts/seed/index.js";

const app = buildApp();

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

describe("seed", () => {
  it("fills a fresh database with the agency's default content and nothing that needs verification", async () => {
    await runSeed();

    const services = (await request(app).get("/api/v1/services/")).body;
    expect(services).toHaveLength(6);
    expect(services[0]).toMatchObject({ slug: "ui-ux-product-design", category: { slug: "design" } });
    expect(services[0].capabilities.length).toBeGreaterThan(0);

    const home = (await request(app).get("/api/v1/pages/home/")).body;
    expect(home.sections.map((s: { section_type: string }) => s.section_type)).toEqual([
      "hero", "featured_project", "impact", "services", "projects", "process", "pricing", "testimonials", "faq", "contact", "blog", "cta_banner",
    ]);
    for (const slug of ["about", "services", "industries", "work", "blog", "contact", "support"]) {
      expect((await request(app).get(`/api/v1/pages/${slug}/`)).status, slug).toBe(200);
    }

    const site = (await request(app).get("/api/v1/site/")).body;
    expect(site.profile).toMatchObject({ email: "qmonaagency@gmail.com", city: "Dhaka" });
    expect(site.navigation.header.map((n: { label: string }) => n.label)).toContain("Start a Project");
    expect(site.navigation.footer_secondary).toHaveLength(6);
    expect(site.legal_pages).toEqual([{ slug: "privacy", title: "Privacy Policy" }]);
    // Terms stay a draft until the agency writes them.
    expect((await request(app).get("/api/v1/legal/terms/")).status).toBe(404);

    // Nothing that needs the agency's verification is published.
    expect(site.availability).toEqual({ blog: false, pricing: false, testimonials: false, team: false });
    expect((await request(app).get("/api/v1/projects/")).body.count).toBe(0);
    expect((await request(app).get("/api/v1/pricing/")).body).toEqual([]);
    const credibility = (await request(app).get("/api/v1/credibility/")).body;
    expect(credibility.every((c: { kind: string }) => c.kind === "capability")).toBe(true);

    const forms = (await request(app).get("/api/v1/forms/options/")).body;
    expect(forms.options.inquiry_topic.length).toBeGreaterThan(3);
    expect(forms.services).toHaveLength(6);
  });

  it("can be run again without overwriting what editors changed", async () => {
    await runSeed();
    const editor = await loggedIn(app, "content_editor");
    const [service] = (await editor.get("/api/v1/manage/services/?page_size=100")).body.results;
    await editor.patch(`/api/v1/manage/services/${service.id}/`).send({ tagline: "Edited by the agency" });
    await runSeed();

    expect((await editor.get(`/api/v1/manage/services/${service.id}/`)).body.tagline).toBe("Edited by the agency");
    expect((await request(app).get("/api/v1/services/")).body).toHaveLength(6);
    expect((await editor.get("/api/v1/manage/faqs/")).body).toHaveLength(6);

    // --reset-copy puts the default copy back.
    await runSeed({ resetCopy: true });
    expect((await editor.get(`/api/v1/manage/services/${service.id}/`)).body.tagline).not.toBe("Edited by the agency");
  });
});
