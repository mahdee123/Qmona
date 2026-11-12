# Progress

Read `AGENTS.md` and `docs/plan.md` first. This file records what is done, the checks actually run, decisions, limits and the
next action. Keep it free of secrets and private infrastructure details (public repository).

## Current state (2026-11-12)
Backend and frontend are complete and verified locally. The release is ready to publish and deploy.
**Blocked:** pushing to GitHub needs SSH authentication for the repository owner's account (see "Blockers").

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

## Not yet verified (honest limits)
- **Docker images have not been built yet**: Docker cannot run on the development PC. They are built and health-checked on the server.
- Upload survival across a container replacement is verified at the file-system level in tests and must be re-checked on the server.
- The origin of visitor addresses behind Cloudflare → proxy → website → API (`TRUST_PROXY=2`) must be confirmed on the server.
- Nothing is deployed or public yet.

## Blockers
- **GitHub push:** `ssh -T git@github.com` was rejected (`Permission denied (publickey)`) for the PC's key. The repository owner must add the
  PC's public key to their GitHub account. Local work continues; this blocks phase 10 and therefore the server pulling the release.

## Next action
1. Add the SSH key to GitHub, then push `main` and record the release commit here.
2. Deploy as described in `docs/deploy/README.md`, record steps in `docs/deploy/changes.md`, smoke-test `qmona.com`.
