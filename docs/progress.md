# Progress

Read `AGENTS.md` and `docs/plan.md` first. This file records what is done, the checks actually run, decisions, limits and the
next action. Keep it free of secrets and private infrastructure details (public repository).

## Current state (2026-11-12)
**Live.** The release is deployed and answering on `qmona.com`, `www.qmona.com` and `api.qmona.com`. Deployed release: commit `b0ac5c9`
(the first push, `28ef61f`, was missing the seed JSON files because a `.gitignore` rule was too broad; found by the first image build and fixed).
Remaining: the owner switches Cloudflare SSL/TLS to **Full (strict)**, rotates the credentials that were shared in chat, and rehearses a restore.

## Completed

### Phase 1–2: audit, fresh repository
- Audited the Django app (9 apps, 33 models, ~55 routes), the Next.js dependencies on it (cookie names `sessionid`/`csrftoken`,
  `/api/v1/` paths with trailing slashes, error and pagination shapes) and the target server.
- Started a fresh git repository (the old history was moved outside the project, not published). Public-safe docs written.

### Phase 3–7: backend (Express, TypeScript strict, Mongoose, Atlas)
- Auth, CSRF, sessions, roles, rate limits, users, audit log, media library, services, industries, portfolio, blog, CMS (pages,
  sections with validated schemas and style presets, FAQ, testimonials, team, pricing, process, credibility, navigation,
  socials, legal, form options, site profile), inquiries with Gmail notification, dashboard, preview, revalidation, seed, create-admin.
- Decisions: see `docs/decisions.md`.

### Phase 8: frontend
- Edits: default ports (API 4000), wording, string ids for users, e2e id pattern, env example, Dockerfile build args, `.dockerignore`.

### Phase 9: Docker and gateway
- `backend/Dockerfile` (multi-stage, non-root, healthcheck), `compose.yaml` (no published ports, external `proxy` network,
  host-mounted uploads, env file outside the release), `deploy/gateway/qmona.conf`, `deploy/.env.production.example`.

## Checks run (2026-11-12)

| Check | Result |
|---|---|
| `backend: npm run typecheck` | pass |
| `backend: npm test` (Vitest + supertest on the Atlas `*_test` database) | **73 passed** in 6 files: auth 17, media 10, content 16, CMS 12, inquiries 16, seed 2 |
| `backend: npm run build` (tsc) and running the compiled `dist` in production mode (Secure cookies, health, seed) | pass |
| `frontend: npm run typecheck`, `npm run lint`, `npm test` (7 unit tests), `npm run build` | pass |
| Playwright browser tests against the live local stack (website + API + Atlas dev database) | **5 passed**: editor logs in, publishes a project that appears on the public site, role limits, contact form validation and submission, public API leaks no internal fields |
| Real email | the contact-form test sent one real notification through Gmail SMTP; the inquiry shows `notification_status: sent` |
| Public pages against the seeded database | `/`, `/about`, `/services`, `/work`, `/industries`, `/contact`, `/support`, `/blog`, `/privacy`, `/admin/login` all 200 |

Tests that exist for: successful and failed sign-in, deactivated accounts, sessions ending on disable/password change, CSRF and
Origin rejection, login and inquiry rate limits, role checks on every management area, input validation and field errors,
upload type sniffing / SVG sanitising / path safety / size limits / in-use protection, publication and confidentiality rules,
partial updates, duplicate and honeypot inquiries, email failure and retry, CSV formula escaping, audit trail, seed idempotence.

### Phase 11 (partly): server preparation, done 2026-11-12
- Removed the unused leftovers of the earlier Django-era attempt (no containers or volumes existed for it).
- Created the project directory with `.env.production` (mode 600, outside the release) and an empty `data/uploads` directory.
- Installed the Cloudflare Origin Certificate files in the reverse proxy's ssl directory (key mode 600).
- The reverse proxy was **not** reloaded and no site config was added yet; the health script showed the existing sites healthy before and after.

### Phase 10–13: publish, deploy, switch traffic, verify (2026-11-12)
- Pushed `main` to GitHub over SSH. Cloned and checked out the release on the server, built both images there, both containers healthy.
- First admin created with a generated password (delivered through a private file, then deleted); default content seeded
  (no projects, testimonials, pricing, statistics or team members).
- Gateway: site config installed, `nginx -t` passed, reloaded with the validated reload script. Health script now includes Qmona.
- Smoke tests against the real domains (through Cloudflare):

| Check | Result |
|---|---|
| `qmona.com`, `www`, `/services`, `/work`, `/about`, `/contact`, `/support`, `/blog`, `/privacy`, `/admin/login`, `sitemap.xml`, `robots.txt` | 200 |
| Unknown path | 404; `/api/revalidate` from the internet → 404 (internal only) |
| `api.qmona.com/api/v1/health` | healthy, database connected (Atlas, database `qmona`) |
| Origin tested directly, bypassing Cloudflare | 200 on all three hostnames |
| Admin sign-in, session cookie, CSRF, sign-out ends the session | pass |
| Image upload, served from `api.qmona.com/media/...`, delete | pass |
| Contact form → stored, notification email `sent`, duplicate submission detected | pass (test record deleted) |
| Visitor address seen by the API (audit trail) | a real public address, not an internal Docker one (`TRUST_PROXY=2` is right) |
| Backend container force-recreated | upload still served, admin session still valid, container healthy again |
| Other sites (SilverGym, Dayflow) via the gateway health script | healthy before and after |

## Limits and notes
- **Cloudflare caches uploaded images**: a deleted image can keep showing from Cloudflare's edge for a while (the origin returns 404).
  File names are random, so replacing an image always produces a new URL; no action needed.
- `/terms` returns 404 until a Terms page is written in the admin (no legal text is invented; nothing links to it yet).
- Backup/restore was documented but **not rehearsed**. Enable Atlas backups and test `mongorestore` into a separate database.
- Cloudflare SSL/TLS mode **Full (strict)** is switched by the owner; traffic already works through Cloudflare with the origin certificate installed.
- Credentials that were pasted into a chat (Atlas database password, Gmail app password) should be rotated; update the server env file and
  restart the backend (`docker compose --env-file ../.env.production up -d --force-recreate backend`).
- Projects, pricing, testimonials, statistics, team: unpublished until the agency verifies content (evidence rules).

## Next action
Owner: Cloudflare Full (strict), rotate the two credentials, sign in to `/admin`, change the generated password, add real content.
