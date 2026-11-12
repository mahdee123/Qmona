import { expect, test } from "@playwright/test";

test("contact form validates, preselects context and submits", async ({ page }) => {
  await page.goto("/contact?service=website-development&industry=not-a-real-industry");
  await expect(page.locator("#service")).toHaveValue("website-development");
  await expect(page.locator("#industry")).toHaveValue(""); // invalid context ignored

  await page.getByRole("button", { name: /send request/i }).click();
  await expect(page.getByRole("alert").first()).toBeFocused();
  for (const id of ["full_name", "email", "message", "privacy_acknowledged"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
  }

  await page.fill("#full_name", "Playwright Test");
  await page.fill("#email", `pw-${Date.now()}@example.com`);
  await page.selectOption("#topic", "new-project");
  await page.fill("#message", "Automated test: we need a booking web app with an admin dashboard.");
  await page.check("#privacy_acknowledged");
  await page.getByRole("button", { name: /send request/i }).click();
  await expect(page.getByText(/Your reference/)).toBeVisible();
});

test("public API exposes no internal fields", async ({ request }) => {
  const res = await request.get("/api/v1/projects/");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(JSON.stringify(body)).not.toMatch(/budget_min|evidence_note|internal/);
});
