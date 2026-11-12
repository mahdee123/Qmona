import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Client, buildApp, loggedIn, resetDatabase, startDatabase, stopDatabase } from "./helpers.js";

const app = buildApp();
let editor: Client;

const png = () => sharp({ create: { width: 24, height: 16, channels: 3, background: "#e1443a" } }).png().toBuffer();
const SVG_OK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#e1443a"/></svg>';

async function upload(client: Client, buf: Buffer, filename: string, fields: Record<string, string> = {}) {
  let req = client.post("/api/v1/manage/media/").attach("file", buf, filename);
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  return req;
}

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  await resetDatabase();
  editor = await loggedIn(app, "content_editor");
});

describe("media upload", () => {
  it("stores a PNG under a random name and reads its size from the content", async () => {
    const res = await upload(editor, await png(), "Hero Banner.PNG", { alt_text: "Banner" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Hero Banner", alt_text: "Banner", file_type: "image", mime_type: "image/png", width: 24, height: 16 });
    expect(res.body.file_url).toMatch(/^http:\/\/localhost:4000\/media\/uploads\/\d{4}\/\d{2}\/[0-9a-f]{32}\.png$/);
    // The original (guessable) filename is not used on disk.
    expect(res.body.file_url).not.toContain("Banner");
    const onDisk = path.join(process.env.UPLOAD_DIR!, new URL(res.body.file_url).pathname.replace(/^\/media\//, ""));
    expect(existsSync(onDisk)).toBe(true);
  });

  it("serves the file with nosniff and a sandboxing CSP", async () => {
    const res = await upload(editor, await png(), "a.png");
    const served = await request(app).get(new URL(res.body.file_url).pathname);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(served.headers["content-security-policy"]).toContain("sandbox");
  });

  it("does not let a path escape the upload directory", async () => {
    const res = await request(app).get("/media/..%2F..%2Fpackage.json");
    expect([403, 404]).toContain(res.status);
    expect((await request(app).get("/media/uploads/nope.png")).status).toBe(404);
  });

  it("decides the type from the content, not the extension", async () => {
    const res = await upload(editor, Buffer.from("<html><script>alert(1)</script></html>"), "evil.png");
    expect(res.status).toBe(400);
    expect(res.body.errors.file).toBeTruthy();
  });

  it("accepts a clean SVG and rejects scripts, handlers and external references", async () => {
    expect((await upload(editor, Buffer.from(SVG_OK), "logo.svg")).status).toBe(201);
    for (const bad of [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="https://evil.example/x.svg#a"/></svg>',
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&x;</text></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div/></foreignObject></svg>',
    ]) {
      const res = await upload(editor, Buffer.from(bad), "bad.svg");
      expect(res.status, bad).toBe(400);
    }
  });

  it("rejects empty and over-size files", async () => {
    expect((await upload(editor, Buffer.alloc(0), "empty.png")).status).toBe(400);
    const big = Buffer.concat([await png(), Buffer.alloc(12 * 1024 * 1024)]);
    const res = await upload(editor, big, "big.png");
    expect([400, 413]).toContain(res.status);
  });

  it("requires a content-editor role", async () => {
    const inquiry = await loggedIn(app, "inquiry_manager");
    expect((await upload(inquiry, await png(), "a.png")).status).toBe(403);
    expect((await request(app).get("/api/v1/manage/media/")).status).toBe(403);
  });
});

describe("media library", () => {
  it("edits metadata, lists with search and paginates", async () => {
    const a = await upload(editor, await png(), "first.png");
    await upload(editor, await png(), "second.png");
    const patch = await editor.patch(`/api/v1/manage/media/${a.body.id}/`).send({ alt_text: "New alt", title: "Renamed" });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({ alt_text: "New alt", title: "Renamed" });

    const list = await editor.get("/api/v1/manage/media/?search=renamed");
    expect(list.body).toMatchObject({ count: 1, page: 1, total_pages: 1 });
    expect(list.body.results[0].uploaded_by_email).toBe("content_editor@example.test");
  });

  it("refuses to delete a file that is in use (409) and deletes it once it is free", async () => {
    const media = await upload(editor, await png(), "used.png");
    const service = await editor.post("/api/v1/manage/services/").send({
      title: "Design", slug: "design", short_description: "x", cover_image: media.body.id,
    });
    expect(service.status).toBe(201);

    const blocked = await editor.delete(`/api/v1/manage/media/${media.body.id}/`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("media_in_use");
    expect(blocked.body.references[0].label).toBe("Service: Design");

    await editor.patch(`/api/v1/manage/services/${service.body.id}/`).send({ cover_image: null });
    const onDisk = path.join(process.env.UPLOAD_DIR!, new URL(media.body.file_url).pathname.replace(/^\/media\//, ""));
    expect(existsSync(onDisk)).toBe(true);
    expect((await editor.delete(`/api/v1/manage/media/${media.body.id}/`)).status).toBe(204);
    expect(existsSync(onDisk)).toBe(false);
  });

  it("rejects a reference to a media file that does not exist", async () => {
    const res = await editor.post("/api/v1/manage/services/").send({
      title: "Design", slug: "design", short_description: "x", cover_image: "64b64b64b64b64b64b64b64b",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.cover_image).toBeTruthy();
  });
});
