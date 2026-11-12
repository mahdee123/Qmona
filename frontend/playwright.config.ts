import { defineConfig } from "@playwright/test";

// Runs against a live stack: E2E_BASE_URL (Next.js) with the backend API behind it.
// Admin specs need E2E_ADMIN_PASSWORD (password shared by test users created with the create-admin script).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL || "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "desktop", use: { viewport: { width: 1280, height: 900 } } }],
});
