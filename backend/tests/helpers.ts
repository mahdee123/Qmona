import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import request from "supertest";
import type { Express } from "express";

// Uploads written by tests go to a throw-away directory, never to the real upload folder.
process.env.UPLOAD_DIR = mkdtempSync(path.join(tmpdir(), "qmona-test-uploads-"));
process.env.MEDIA_PUBLIC_BASE_URL = "http://localhost:4000";
process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";
process.env.REVALIDATION_ENABLED = "false";
process.env.INQUIRY_NOTIFICATION_EMAILS = "owner@example.test";
process.env.EMAIL_FROM = "Qmona Test <noreply@example.test>";

const { connectDatabase, disconnectDatabase } = await import("../src/config/database.js");
const { createApp } = await import("../src/app.js");
const { createUser } = await import("../src/modules/user/user.service.js");
export type { Role } from "../src/modules/user/user.interface.js";

export const PASSWORD = "Correct-Horse-9!";

export async function startDatabase() {
  await connectDatabase();
}

export async function stopDatabase() {
  await disconnectDatabase();
}

/** Empties every collection in the test database (the config refuses to run on a non-_test database). */
export async function resetDatabase() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export function buildApp(limits?: { anonPerMin?: number; login?: number; inquiryPerHour?: number }): Express {
  // Generous limits by default so tests are not throttled; rate-limit tests pass their own.
  return createApp({ limits: { anonPerMin: 10_000, login: 10_000, inquiryPerHour: 10_000, ...limits } });
}

export async function makeUser(role: "super_admin" | "content_editor" | "inquiry_manager", name = role) {
  return createUser({
    username: name,
    email: `${name}@example.test`,
    role,
    password: PASSWORD,
    first_name: "Test",
    last_name: "User",
  });
}

/** A browser-like client: keeps cookies, fetches a CSRF token and adds it to unsafe requests. */
export class Client {
  readonly agent;
  token = "";

  private constructor(app: Express) {
    this.agent = request.agent(app);
  }

  /** Creates a client that already holds a CSRF cookie and token. */
  static async create(app: Express): Promise<Client> {
    const client = new Client(app);
    await client.refreshCsrf();
    return client;
  }

  async refreshCsrf(): Promise<string> {
    const res = await this.agent.get("/api/v1/auth/csrf/");
    this.token = res.body.csrfToken as string;
    return this.token;
  }

  get(url: string) {
    return this.agent.get(url);
  }
  post(url: string) {
    return this.agent.post(url).set("X-CSRFToken", this.token);
  }
  patch(url: string) {
    return this.agent.patch(url).set("X-CSRFToken", this.token);
  }
  delete(url: string) {
    return this.agent.delete(url).set("X-CSRFToken", this.token);
  }

  async login(email: string, password = PASSWORD) {
    const res = await this.post("/api/v1/auth/login/").send({ username_or_email: email, password });
    // Login rotates the CSRF cookie; read it back for the next request.
    await this.refreshCsrf();
    return res;
  }
}

export function cookiesOf(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  return (Array.isArray(raw) ? raw : raw ? [String(raw)] : []).join(";");
}

export async function loggedIn(app: Express, role: "super_admin" | "content_editor" | "inquiry_manager") {
  await makeUser(role);
  const client = await Client.create(app);
  const res = await client.login(`${role}@example.test`);
  if (res.status !== 200) throw new Error(`login failed in test setup: ${res.status}`);
  return client;
}
