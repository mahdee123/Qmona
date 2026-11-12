import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Client, buildApp, loggedIn, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";
import { setMailTransport } from "../src/modules/inquiries/notifications.js";

const app = buildApp();
const M = "/api/v1/manage";
let editor: Client;
let sent: { to: string[]; replyTo: string; subject: string; text: string }[] = [];

const okTransport = { sendMail: vi.fn(async (m: (typeof sent)[number]) => void sent.push(m)) } as never;
const failingTransport = { sendMail: vi.fn(async () => { throw new Error("SMTP down"); }) } as never;

beforeAll(startDatabase);
afterAll(async () => {
  setMailTransport(null);
  await stopDatabase();
});
beforeEach(async () => {
  await resetDatabase();
  sent = [];
  setMailTransport(okTransport);
  editor = await loggedIn(app, "content_editor");
  for (const [kind, value, label] of [
    ["inquiry_topic", "new-project", "New project"], ["budget_range", "10k", "$10k+"], ["timeline", "3m", "3 months"],
    ["contact_method", "email", "Email"], ["support_category", "bug", "Bug report"],
  ]) {
    await editor.post(`${M}/form-options/`).send({ kind, value, label });
  }
  await editor.post(`${M}/services/`).send({ title: "Websites", slug: "websites", short_description: "Sites." });
});

const contact = (extra: Record<string, unknown> = {}) => ({
  inquiry_type: "contact", full_name: "Jane Doe", email: "jane@example.com", topic: "new-project", service: "websites", budget: "10k",
  timeline: "3m", contact_method: "email", message: "We need a new website for our company.", privacy_acknowledged: true, ...extra,
});

async function submit(body: Record<string, unknown>, application = app) {
  const client = await Client.create(application);
  return client.post("/api/v1/inquiries/").send(body);
}

describe("public submission", () => {
  it("saves the inquiry, answers with a reference and emails the agency", async () => {
    const res = await submit(contact({ company: "Acme", phone_country_code: "+880", phone: "17 000 000" }));
    expect(res.status).toBe(201);
    expect(res.body.reference).toMatch(/^QM-[0-9A-F]{6}$/);
    expect(res.body.duplicate).toBe(false);

    const admin = await loggedIn(app, "inquiry_manager");
    const list = await admin.get(`${M}/inquiries/`);
    expect(list.body.count).toBe(1);
    expect(list.body.results[0]).toMatchObject({ full_name: "Jane Doe", topic: "New project", service_title: "Websites", status: "new", is_read: false, notification_status: "sent" });

    // The notification goes to the configured address, with the visitor as reply-to.
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ replyTo: "jane@example.com" });
    expect(sent[0]!.subject).toContain(res.body.reference);
    expect(sent[0]!.text).toContain("We need a new website");
  });

  it("still saves the inquiry when email delivery fails, and staff can retry", async () => {
    setMailTransport(failingTransport);
    const res = await submit(contact());
    expect(res.status).toBe(201);

    const admin = await loggedIn(app, "inquiry_manager");
    const item = (await admin.get(`${M}/inquiries/`)).body.results[0];
    expect(item.notification_status).toBe("failed");
    const detail = await admin.get(`${M}/inquiries/${item.id}/`);
    expect(detail.body.notification_error).toContain("SMTP down");

    setMailTransport(okTransport);
    const retry = await admin.post(`${M}/inquiries/${item.id}/retry-notification/`).send({});
    expect(retry.body).toMatchObject({ notification_status: "sent", notification_attempts: 2 });
    const again = await admin.post(`${M}/inquiries/${item.id}/retry-notification/`).send({});
    expect(again.status).toBe(400);
    expect(again.body.code).toBe("already_sent");
  });

  it("treats a repeated submission as a duplicate", async () => {
    await submit(contact());
    const second = await submit(contact());
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    const admin = await loggedIn(app, "inquiry_manager");
    expect((await admin.get(`${M}/inquiries/`)).body.count).toBe(1);
  });

  it("silently ignores bots that fill the honeypot", async () => {
    const res = await submit(contact({ hp_website: "http://spam.example" }));
    expect(res.status).toBe(201);
    expect(res.body.reference).toBeNull();
    const admin = await loggedIn(app, "inquiry_manager");
    expect((await admin.get(`${M}/inquiries/`)).body.count).toBe(0);
  });

  it("validates fields and options", async () => {
    const res = await submit(contact({ email: "nope", message: "short", privacy_acknowledged: false, phone: "abc" }));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(["email", "message", "privacy_acknowledged", "phone"]));
    // Option values are checked against the options the agency manages.
    const options = await submit(contact({ topic: "made-up", service: "ghost" }));
    expect(options.status).toBe(400);
    expect(Object.keys(options.body.errors)).toEqual(expect.arrayContaining(["topic", "service"]));
    const noCsrf = await request(app).post("/api/v1/inquiries/").send(contact());
    expect(noCsrf.status).toBe(403);
  });

  it("accepts the open choices 'other' and 'not-sure'", async () => {
    const res = await submit(contact({ service: "not-sure", industry: "other" }));
    expect(res.status).toBe(201);
  });

  it("handles support requests", async () => {
    const bad = await submit({ inquiry_type: "support", full_name: "Sam", email: "sam@example.com", message: "Something is broken please help.", privacy_acknowledged: true });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toHaveProperty("subject");
    expect(bad.body.errors).toHaveProperty("support_category");
    const ok = await submit({ inquiry_type: "support", subject: "Login bug", support_category: "bug", full_name: "Sam", email: "sam@example.com", message: "Something is broken please help.", privacy_acknowledged: true });
    expect(ok.status).toBe(201);
  });

  it("is rate limited per visitor", async () => {
    const limited = buildApp({ inquiryPerHour: 2 });
    for (let i = 0; i < 2; i++) expect((await submit(contact({ message: `Message number ${i} for the rate limit test.` }), limited)).status).toBe(201);
    const third = await submit(contact({ message: "A third message that should be throttled." }), limited);
    expect(third.status).toBe(429);
    expect(third.body.code).toBe("throttled");
  });

  it("does not store a source page that leaves the site", async () => {
    await submit(contact({ source_page: "//evil.example/x" }));
    const admin = await loggedIn(app, "inquiry_manager");
    const id = (await admin.get(`${M}/inquiries/`)).body.results[0].id;
    expect((await admin.get(`${M}/inquiries/${id}/`)).body.source_page).toBe("/contact");
  });
});

describe("inquiry management", () => {
  async function seed(n = 1) {
    for (let i = 0; i < n; i++) await submit(contact({ full_name: `Visitor ${i}`, email: `v${i}@example.com`, message: `Hello number ${i}, we want a website.` }));
    return loggedIn(app, "inquiry_manager");
  }

  it("marks an inquiry read when it is opened and tracks status changes and notes", async () => {
    const admin = await seed();
    const id = (await admin.get(`${M}/inquiries/`)).body.results[0].id;

    const opened = await admin.get(`${M}/inquiries/${id}/`);
    expect(opened.body).toMatchObject({ is_read: true, service: { title: "Websites", slug: "websites" }, message: expect.stringContaining("website") });
    expect(opened.body).not.toHaveProperty("submission_hash");
    expect(opened.body).not.toHaveProperty("user_agent");

    const status = await admin.post(`${M}/inquiries/${id}/status/`).send({ status: "contacted", comment: "Called them" });
    expect(status.body.status).toBe("contacted");
    expect(status.body.status_history[0]).toMatchObject({ from_status: "new", to_status: "contacted", comment: "Called them" });
    expect((await admin.post(`${M}/inquiries/${id}/status/`).send({ status: "bogus" })).status).toBe(400);

    const note = await admin.post(`${M}/inquiries/${id}/notes/`).send({ note: "Budget confirmed" });
    expect(note.status).toBe(201);
    expect(note.body).toMatchObject({ note: "Budget confirmed", author: { email: "inquiry_manager@example.test" } });
    expect((await admin.post(`${M}/inquiries/${id}/notes/`).send({ note: "  " })).status).toBe(400);
    expect((await admin.get(`${M}/inquiries/${id}/`)).body.notes).toHaveLength(1);
  });

  it("assigns, archives and filters", async () => {
    const admin = await seed(3);
    const me = (await admin.get("/api/v1/auth/me/")).body;
    const items = (await admin.get(`${M}/inquiries/`)).body.results;

    const assigned = await admin.patch(`${M}/inquiries/${items[0].id}/`).send({ assigned_to: me.id });
    expect(assigned.body.assigned_to).toMatchObject({ id: me.id, email: me.email });
    await admin.patch(`${M}/inquiries/${items[1].id}/`).send({ is_archived: true });

    expect((await admin.get(`${M}/inquiries/`)).body.count).toBe(2);
    expect((await admin.get(`${M}/inquiries/?archived=true`)).body.count).toBe(1);
    expect((await admin.get(`${M}/inquiries/?archived=all`)).body.count).toBe(3);
    expect((await admin.get(`${M}/inquiries/?assigned_to=me`)).body.count).toBe(1);
    expect((await admin.get(`${M}/inquiries/?assigned_to=none`)).body.count).toBe(1);
    expect((await admin.get(`${M}/inquiries/?search=Visitor 2`)).body.count).toBe(1);
    expect((await admin.get(`${M}/inquiries/?service=websites`)).body.count).toBe(2);

    const bogus = await admin.patch(`${M}/inquiries/${items[0].id}/`).send({ assigned_to: "64b64b64b64b64b64b64b64b" });
    expect(bogus.status).toBe(400);
    expect((await admin.get(`${M}/inquiries/assignees/`)).body[0].email).toBe("inquiry_manager@example.test");
  });

  it("exports CSV with formula injection neutralised", async () => {
    await submit(contact({ full_name: "=HYPERLINK(\"http://evil\")", email: "x@example.com" }));
    const admin = await loggedIn(app, "inquiry_manager");
    const res = await admin.get(`${M}/inquiries/export/`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("qmona-inquiries-");
    expect(res.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(res.text.split("\n")[0]).toContain("Reference");
  });

  it("only deletes with the reference as confirmation", async () => {
    const admin = await seed();
    const item = (await admin.get(`${M}/inquiries/`)).body.results[0];
    const refused = await admin.delete(`${M}/inquiries/${item.id}/`);
    expect(refused.status).toBe(400);
    expect(refused.body.code).toBe("confirmation_required");
    expect((await admin.delete(`${M}/inquiries/${item.id}/?confirm=${item.reference}`)).status).toBe(204);
    expect((await admin.get(`${M}/inquiries/`)).body.count).toBe(0);
  });

  it("is limited to inquiry managers and super admins", async () => {
    await submit(contact());
    expect((await editor.get(`${M}/inquiries/`)).status).toBe(403);
    expect((await request(app).get(`${M}/inquiries/`)).status).toBe(403);
    const root = await loggedIn(app, "super_admin");
    expect((await root.get(`${M}/inquiries/`)).body.count).toBe(1);
  });
});

describe("dashboard and audit", () => {
  it("gives each role only its own sections", async () => {
    await submit(contact());
    const manager = await loggedIn(app, "inquiry_manager");
    const m = (await manager.get(`${M}/dashboard/`)).body;
    expect(m.inquiries).toMatchObject({ unread: 1, new: 1, open_contact: 1, by_type_and_status: { contact: { new: 1 } } });
    expect(m.content).toBeUndefined();

    const e = (await editor.get(`${M}/dashboard/`)).body;
    expect(e.inquiries).toBeUndefined();
    expect(e.content).toMatchObject({ services_active: 1 });
    expect((await request(app).get(`${M}/dashboard/`)).status).toBe(403);
  });

  it("records changes in the audit trail for super admins only", async () => {
    const created = await editor.post(`${M}/industries/`).send({ name: "Retail", slug: "retail" });
    await editor.patch(`${M}/industries/${created.body.id}/`).send({ is_active: false });
    const root = await loggedIn(app, "super_admin");
    const events = await root.get(`${M}/audit-events/?target_model=Industry`);
    expect(events.body.results.map((e: { action: string }) => e.action)).toEqual(["publish", "create"]);
    expect(events.body.results[0]).toMatchObject({ actor_email: "content_editor@example.test", details: { publication: { is_active: { from: "true", to: "false" } } } });
    expect((await editor.get(`${M}/audit-events/`)).status).toBe(403);
  });
});
