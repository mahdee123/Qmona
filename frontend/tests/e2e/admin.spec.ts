import { expect, test } from "@playwright/test";

const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
test.skip(!PASSWORD, "set E2E_ADMIN_PASSWORD (users editor@qmona.local / leads@qmona.local)");

async function login(page: import("@playwright/test").Page, who: string) {
  await page.goto("/admin/projects");
  await page.waitForURL(/\/admin\/login/);
  await page.fill("#identifier", who);
  await page.fill("#password", PASSWORD!);
  await page.click("button[type=submit]");
}

test("editor publishes a project that appears publicly, then it is cleaned up", async ({ page }) => {
  await login(page, "editor@qmona.local");
  await page.waitForURL(/\/admin\/projects$/);
  await page.goto("/admin/projects/new");
  const title = `E2E Project ${Date.now()}`;
  await page.fill("#title", title);
  await page.fill("#summary", "Created by the automated test.");
  await page.selectOption("#publication_status", "Published");
  await page.locator("form button[type=submit]").first().click();
  await page.waitForURL(/\/admin\/projects\/[0-9a-f]{24}$/);
  const adminUrl = page.url();
  await page.waitForTimeout(1500);
  await expect.poll(async () => (await page.request.get("/work")).text(), { timeout: 15000 }).toContain(title);

  await page.goto(adminUrl);
  await page.getByRole("button", { name: /^Delete/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/admin\/projects$/);
});

test("content editor cannot use inquiry endpoints", async ({ page }) => {
  await login(page, "editor@qmona.local");
  await page.waitForURL(/\/admin\/projects$/);
  expect((await page.request.get("/api/v1/manage/inquiries/")).status()).toBe(403);
  await page.goto("/admin/inquiries");
  await expect(page.getByText("No access")).toBeVisible();
});

test("inquiry manager cannot manage content", async ({ page }) => {
  await login(page, "leads@qmona.local");
  await page.waitForURL(/\/admin/);
  expect((await page.request.get("/api/v1/manage/projects/")).status()).toBe(403);
});
