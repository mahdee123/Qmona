# Plan — Qmona on Node.js

Status legend: ✅ done · 🔄 in progress · ⏳ pending · ⛔ blocked

**Goal:** keep the Next.js frontend, replace the Django backend with a Node.js backend (Express, strict TypeScript, Mongoose,
MongoDB Atlas), run it with Docker Compose with uploads on a persistent host directory, and deploy to the shared server at
`qmona.com` (website) and `api.qmona.com` (API/images). Fresh database, fresh repository history, no data migration.

## Phases

| # | Phase | Depends on | Acceptance check | Status |
|---|---|---|---|---|
| 1 | Audit the Django app, the repo and the server; agree scope | — | Written audit and approved plan | ✅ |
| 2 | Fresh repository, public-safe docs, `AGENTS.md`, plan/progress files | 1 | Secrets and infrastructure details absent from tracked files; env files ignored | ✅ |
| 3 | Backend foundation: env validation, Mongo, errors, sessions, CSRF, roles, rate limits, users, `create-admin` | 2 | `npm run typecheck` and auth tests pass | ✅ |
| 4 | Uploads and media library (type sniffing, SVG sanitising, usage tracking, safe paths) | 3 | media tests pass | ✅ |
| 5 | Content modules: services, industries, portfolio, blog, CMS (pages, sections, FAQ, testimonials, team, pricing, process, credibility, navigation, socials, legal, form options, site profile) | 3, 4 | content + CMS tests pass; evidence rules verified | ✅ |
| 6 | Inquiries (public form, notification email, staff workflow, CSV export), dashboard, audit log, preview, revalidation | 3, 5 | inquiry/dashboard/audit tests pass; one real email sent | ✅ |
| 7 | Seed script (`backend/scripts/seed`) with JSON data per area | 5 | seed test passes; public site renders from seeded data | ✅ |
| 8 | Frontend adjustments and full local verification | 3–7 | frontend typecheck, lint, unit tests, build; Playwright browser tests against the running stack | ✅ |
| 9 | Docker: backend image, `compose.yaml`, gateway site config, env templates | 8 | images build on the server; container healthchecks pass | ✅ (images built and healthy on the server) |
| 10 | Publish to GitHub (`main`) and record the release commit | 2–9 | `ssh -T git@github.com` authenticates; push succeeds; no secrets in history | ✅ |
| 11 | Deploy: release clone, env file, uploads directory, build, start, create first admin, seed | 9, 10 | `docker compose ps` healthy; admin created; seeded | ✅ |
| 12 | Switch traffic: certificate, gateway config, reload, Cloudflare SSL *Full (strict)* | 11 | smoke test on the real domains; other sites still healthy | ✅ live · ⏳ Cloudflare Full (strict) is switched by the owner |
| 13 | Verify: smoke test on `qmona.com`, upload survives a container replacement, backup/restore notes | 12 | recorded in `docs/deploy/changes.md` | ✅ smoke + upload survival · ⏳ backup/restore rehearsal |
| 14 | Handover | 13 | summary of what changed, what passed, release commit, what is unverified | ⏳ |

## Deployment scope (approved)
- Server directory `<deploy-root>` for this project only: release clone, `.env.production` (outside the release), `data/uploads`.
- One new site config file in the shared reverse proxy plus the certificate files; applied only through the proxy's
  validate-then-reload script. No other project, container, volume or proxy route is modified.
- Containers `qmona-frontend` and `qmona-backend` on the shared Docker network; **no published host ports**.
- No downtime: the site is not live before this deployment.

## Rollback
Remove the site config file and reload the proxy; `docker compose down` in the project directory. Uploads and Atlas data are kept.

## Out of scope
Password reset by email, email verification, social sign-in (none existed), the Django admin, S3 storage (can be added later),
real project/testimonial/pricing content (must come from the agency).
