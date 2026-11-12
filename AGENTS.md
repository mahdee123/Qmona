# AGENTS.md — Qmona Agency engineering rules

Rules for any AI agent or developer working on this repository. **Before changing anything, read this file, `docs/plan.md`
and `docs/progress.md`** — they record what is done, what is pending and the next action, so you can resume from the saved state.

## 1. Operating principles

1. **Read first**, inspect before writing: check existing modules, endpoints, components and conventions and reuse them.
2. **Preserve working code and data.** Never wipe a database or delete uploads to get past an error.
3. **Separation of concerns.** The Express backend owns persistence, validation, business rules and authorization. Next.js owns
   presentation and client state. Never rely on the frontend for access control.
4. **Single source of truth.** One implementation per concern: API client `frontend/src/lib/api.ts` / `client-api.ts`; design tokens
   `frontend/src/app/globals.css`; icon keys `backend/src/lib/icons.ts` ↔ `frontend/src/components/ui/icon.tsx`;
   section content schemas `backend/src/modules/cms/section-schemas.ts`.
5. **Truthful status.** Never mark mockups or unconnected UI as complete. Update `docs/progress.md` with what was done, the checks
   actually run (with results), limitations and the next action. A phase is done only when its build, type checks and tests pass.
6. **Record decisions** in `docs/decisions.md` and keep `docs/api.md` in sync with endpoint changes.

## 2. Content integrity (Evidence Standard)

- Never invent clients, logos, testimonials, statistics, awards, budgets, results, team members, legal status or revenue.
- Confirmed facts: agency name, `qmonaagency@gmail.com`, the Dhaka (Banasree) address, the six service groups and the product
  capabilities listed in `docs/project-spec.md`.
- Projects, pricing, testimonials, statistics/awards/client logos and team members stay **unpublished** until the agency verifies
  them. The backend enforces verification for testimonials and credibility claims (see `cms.router.ts`).
- Do not reuse the design reference's copy, names, numbers or images.

## 3. Architecture

- **Frontend:** Next.js 15 App Router, TypeScript strict, Tailwind CSS 4 (`frontend/`).
- **Backend:** Node.js 22, Express 5, TypeScript strict, Mongoose, Zod, MongoDB Atlas (`backend/`). No other database.
- API prefix `/api/v1/`. Public endpoints are read-only and published-only; management endpoints live under `/api/v1/manage/`
  and are role-checked (`super_admin`, `content_editor`, `inquiry_manager`).
- Session auth: an httpOnly `sessionid` cookie (server-side session in MongoDB) plus double-submit CSRF (`csrftoken` cookie and
  `X-CSRFToken` header). The browser talks to the API same-origin through the Next.js rewrite. No public registration;
  accounts are created by a Super Admin in the UI or with `npm run create-admin`.
- Rich content is stored as validated JSON blocks and rendered with React components — never inject stored HTML. Uploaded SVGs
  are only rendered via `<img>`.
- Uploads live on a host directory (`UPLOAD_DIR`) outside the release, served by the API at `/media`.
- Deployment: Docker Compose (`compose.yaml`) behind the server's shared reverse proxy. See `docs/deploy/README.md`.

### Backend structure (feature-based)

```
backend/src/
  app.ts            Express app (importable by tests)      server.ts   startup + graceful shutdown
  config/           env validation (zod), database connection
  errors/           ApiError + central error handler
  middleware/       session, csrf, auth (roles), rate limits
  lib/              shared helpers: crud engine, pagination, validators, blocks, media references
  modules/<feature>/  <feature>.model.ts, .validation.ts, .router.ts (+ .controller.ts / .service.ts where logic grows)
  routes/index.ts   mounts every module's public and management routes
backend/scripts/    create-admin.ts, seed.ts, seed/ (data/*.json + loader)
backend/tests/      Vitest + supertest against the Atlas *_test database
```

- Routers register routes and middleware; controllers handle HTTP; services hold business rules; models hold schemas.
  Simple CRUD resources are declared once with `manageRouter` / `publicRouter` (`lib/crud.ts`, `lib/public.ts`) — add a new
  resource by describing it, not by copying handlers.
- Keep input validation next to its feature (`*.validation.ts`). **Never use zod `.default()`**: defaults live in the Mongoose
  schema so a partial PATCH can never overwrite fields it did not send.
- New feature checklist: model → validation → router (public + manage) → register in `routes/index.ts` → register media usage
  (`registerMediaRefs`) if it references uploads → tests → `docs/api.md`.
- File naming: `kebab-case` folders, `<feature>.<role>.ts` files; React components in `frontend/src/components` and
  `frontend/src/features/<feature>`.

## 4. Commands

```bash
cd backend  && npm run typecheck && npm test && npm run build      # tests need MONGODB_TEST_URI (database name ends in _test)
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
cd frontend && E2E_ADMIN_PASSWORD=... npx playwright test          # needs the stack running locally
cd backend  && npm run dev | seed | create-admin -- --email ... --username ...
```

## 5. Public-repository rules

This repository is **public**. Never commit or paste into any file (code, docs, logs, progress notes, comments):

- passwords, tokens, API keys, SMTP credentials, database URIs, session secrets, private keys, certificates;
- real server addresses, SSH users/ports, host-specific paths, private ports, cluster names or other infrastructure details.
  Use placeholders such as `<server>`, `<deploy-root>`, `<gateway-dir>`, `<cluster-host>`.
- Real `.env` files are git-ignored (only `*.example` templates are tracked). `tmp/` is git-ignored scratch space and is excluded
  from releases. Server connection details and private operational notes are kept outside the repository.
- Docker images must not contain secrets: pass them at run time through the env file, never as build args.
