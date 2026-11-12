import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Client, PASSWORD, cookiesOf, buildApp, loggedIn, makeUser, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";

const app = buildApp();

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

describe("health", () => {
  it("reports a connected database", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "healthy", database: "connected" });
  });
});

describe("csrf", () => {
  it("sets the csrftoken cookie and returns the token", async () => {
    const res = await request(app).get("/api/v1/auth/csrf/");
    expect(res.status).toBe(200);
    expect(cookiesOf(res)).toContain("csrftoken=");
    expect(res.body.csrfToken).toBeTruthy();
  });

  it("rejects state-changing requests without a matching token", async () => {
    await makeUser("super_admin");
    const res = await request(app).post("/api/v1/auth/login/").send({ username_or_email: "super_admin@example.test", password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("csrf_failed");
  });

  it("rejects a request from a foreign origin even with a valid token", async () => {
    const client = await Client.create(app);
    const token = client.token;
    const res = await client.agent.post("/api/v1/auth/login/").set("X-CSRFToken", token).set("Origin", "https://evil.example").send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("csrf_failed");
  });
});

describe("login", () => {
  it("signs in with an email, sets an httpOnly session cookie and returns capabilities", async () => {
    await makeUser("super_admin");
    const client = await Client.create(app);
    const res = await client.login("SUPER_ADMIN@example.test");
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "super_admin@example.test", role: "super_admin" });
    expect(res.body.user.capabilities).toEqual({ manage_content: true, manage_inquiries: true, manage_users: true, view_audit_log: true });
    expect(res.body.user.password_hash).toBeUndefined();
    const cookies = cookiesOf(res);
    expect(cookies).toMatch(/sessionid=[^;]+;.*HttpOnly/i);
  });

  it("signs in with a username", async () => {
    await makeUser("content_editor");
    const res = await (await (await Client.create(app)).login("content_editor"));
    expect(res.status).toBe(200);
  });

  it("rejects a wrong password with a generic message", async () => {
    await makeUser("super_admin");
    const res = await (await (await Client.create(app)).login("super_admin@example.test", "wrong-password-123"));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: "invalid_credentials", detail: "Invalid email/username or password." });
  });

  it("rejects an unknown account with the same message", async () => {
    const res = await (await (await Client.create(app)).login("nobody@example.test"));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid_credentials");
  });

  it("rejects a deactivated account", async () => {
    const user = await makeUser("content_editor");
    user.is_active = false;
    await user.save();
    const res = await (await (await Client.create(app)).login("content_editor@example.test"));
    expect(res.status).toBe(400);
  });

  it("validates required fields", async () => {
    const client = await Client.create(app);
    const res = await client.post("/api/v1/auth/login/").send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("validation_error");
    expect(res.body.errors.username_or_email).toBeTruthy();
  });
});

describe("session", () => {
  it("returns the current user and then signs out", async () => {
    const client = await loggedIn(app, "inquiry_manager");
    const me = await client.get("/api/v1/auth/me/");
    expect(me.status).toBe(200);
    expect(me.body.capabilities).toMatchObject({ manage_content: false, manage_inquiries: true, manage_users: false });

    const out = await client.post("/api/v1/auth/logout/").send();
    expect(out.status).toBe(200);
    expect((await client.get("/api/v1/auth/me/")).status).toBe(403);
  });

  it("refuses anonymous access to protected routes", async () => {
    const res = await request(app).get("/api/v1/auth/me/");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("not_authenticated");
  });

  it("ends the session when the account is deactivated", async () => {
    const admin = await loggedIn(app, "super_admin");
    const editor = await makeUser("content_editor");
    const editorClient = await Client.create(app);
    await editorClient.login("content_editor@example.test");
    expect((await editorClient.get("/api/v1/auth/me/")).status).toBe(200);

    const res = await admin.patch(`/api/v1/auth/users/${editor._id}/`).send({ is_active: false });
    expect(res.status).toBe(200);
    expect((await editorClient.get("/api/v1/auth/me/")).status).toBe(403);
  });
});

describe("login rate limit", () => {
  it("answers 429 after too many attempts", async () => {
    const limited = buildApp({ login: 3 });
    await makeUser("super_admin");
    const client = await Client.create(limited);
    let last = 0;
    for (let i = 0; i < 5; i++) last = (await client.login("super_admin@example.test", "wrong-password-123")).status;
    expect(last).toBe(429);
  });
});

describe("user management", () => {
  it("lets a Super Admin create users but not other roles", async () => {
    const admin = await loggedIn(app, "super_admin");
    const created = await admin.post("/api/v1/auth/users/").send({
      username: "newbie", email: "newbie@example.test", password: "Another-Strong-1!", role: "content_editor",
    });
    expect(created.status).toBe(201);
    expect(created.body.role).toBe("content_editor");
    expect(created.body.password).toBeUndefined();

    const editor = await loggedIn(app, "content_editor");
    expect((await editor.get("/api/v1/auth/users/")).status).toBe(403);
  });

  it("rejects weak passwords and self-demotion", async () => {
    const admin = await loggedIn(app, "super_admin");
    const weak = await admin.post("/api/v1/auth/users/").send({
      username: "weakling", email: "weak@example.test", password: "1234567890", role: "content_editor",
    });
    expect(weak.status).toBe(400);

    const me = await admin.get("/api/v1/auth/me/");
    const demote = await admin.patch(`/api/v1/auth/users/${me.body.id}/`).send({ role: "content_editor" });
    expect(demote.status).toBe(400);
    expect(demote.body.errors.role).toBeTruthy();
  });

  it("changes a password and signs the account out elsewhere", async () => {
    const admin = await loggedIn(app, "super_admin");
    const editor = await makeUser("content_editor");
    const other = await Client.create(app);
    await other.login("content_editor@example.test");

    const res = await admin.post(`/api/v1/auth/users/${editor._id}/set-password/`).send({ password: "Brand-New-Pass-77!" });
    expect(res.status).toBe(200);
    expect((await other.get("/api/v1/auth/me/")).status).toBe(403);
    expect((await (await (await Client.create(app)).login("content_editor@example.test", "Brand-New-Pass-77!"))).status).toBe(200);
  });
});
