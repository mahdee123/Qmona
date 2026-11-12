# Qmona Agency — website and admin portal

The public website for Qmona Agency and the system the team uses to run it: a CMS, media library, project-inquiry and
support workflow, and a role-based admin portal.

- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind CSS 4) — `frontend/`
- **Backend:** Node.js 22, Express 5, TypeScript, Mongoose, MongoDB Atlas — `backend/`
- **Deployment:** Docker Compose behind a shared reverse proxy — `compose.yaml`, `docs/deploy/`

Read [`AGENTS.md`](AGENTS.md), [`docs/plan.md`](docs/plan.md) and [`docs/progress.md`](docs/progress.md) before changing anything.

## Local development

Requirements: Node.js 22+, and a MongoDB Atlas database user (one database for development, one ending in `_test` for tests).

```bash
# 1. API
cd backend
cp .env.example .env            # fill in MONGODB_URI (dev database) and MONGODB_TEST_URI (test database)
npm install
npm run seed                    # default agency content (safe to re-run; --reset-copy restores the default copy)
npm run create-admin -- --email you@example.com --username you     # asks for a password; no default admin exists
npm run dev                     # http://localhost:4000

# 2. Website (second terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3000   admin: http://localhost:3000/admin
```

The browser always calls the API on the website's own origin (`/api/v1/...`); Next.js proxies it to the backend, so the
session and CSRF cookies work without any cross-domain setup.

## Checks

```bash
cd backend  && npm run typecheck && npm test && npm run build
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
cd frontend && E2E_ADMIN_PASSWORD=<test-password> npx playwright test   # browser tests, stack must be running
```

## Documentation

| File | What |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | how the system fits together and how to add a feature |
| [`docs/api.md`](docs/api.md) | API behaviour, conventions, endpoint list, differences from the earlier Django API |
| [`docs/deploy/README.md`](docs/deploy/README.md) | deploy, update, back up, restore and roll back |
| [`docs/deploy/changes.md`](docs/deploy/changes.md) | log of what was actually deployed and verified |
| [`docs/admin-guide.md`](docs/admin-guide.md) | for the people who edit content |
| [`docs/project-spec.md`](docs/project-spec.md), [`docs/design-system.md`](docs/design-system.md) | confirmed facts, design tokens |
| [`docs/plan.md`](docs/plan.md), [`docs/progress.md`](docs/progress.md), [`docs/decisions.md`](docs/decisions.md) | plan, status, decision log |
