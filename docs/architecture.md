# Architecture

## Overview

```
Visitor / editor browser
        │  https://qmona.com   (website + /admin)         https://api.qmona.com (images, direct API)
        ▼
   Cloudflare ──► shared reverse proxy (TLS, one config file per project)
                        │                          │
                        ▼                          ▼
              qmona-frontend (Next.js)      qmona-backend (Express API)
                        │  /api/v1/* rewrite         │
                        └────────────────────────────┤
                                                     ├── MongoDB Atlas   (all data)
                                                     ├── uploads volume  (images, served at /media)
                                                     └── SMTP            (inquiry notification email)
```

- The browser calls `/api/v1/...` on the **website's own origin**. Next.js proxies it to the API (`next.config.ts` rewrites), so
  the `sessionid` and `csrftoken` cookies are first-party and no cross-domain cookie setup is needed.
- Server-side page rendering calls the API directly over the private Docker network (`BACKEND_INTERNAL_URL`) and caches
  responses with tags. After an editor changes content the API calls the website's `/api/revalidate` (shared secret) to drop
  the affected tags; a 5-minute timer is the fallback.
- Uploaded images are public files named `<random>.<ext>` served by the API at `/media/...` with `nosniff` and a sandboxing
  `Content-Security-Policy`. Their URLs use `MEDIA_PUBLIC_BASE_URL` (the public API origin); `MEDIA_ORIGINS` in the frontend
  allows that origin for `next/image` and is fixed at build time.

## Backend

| Concern | Where |
|---|---|
| Startup, graceful shutdown | `src/server.ts` |
| App factory (importable by tests) | `src/app.ts` |
| Environment validation | `src/config/env.ts` (zod; fails fast, never prints values) |
| Errors → `{ detail, code, errors }` | `src/errors/` |
| Sessions, CSRF, roles, rate limits | `src/middleware/` |
| Generic CRUD / public-read engines | `src/lib/crud.ts`, `src/lib/public.ts` |
| Features | `src/modules/<feature>/` |

### Authentication and authorization
- `POST /auth/login/` verifies the password (scrypt) and creates a server-side session. Only the SHA-256 of the cookie value is
  stored (`sessions` collection, expires automatically). Disabling an account, changing its role or its password signs it out.
- Every state-changing request needs the double-submit CSRF token (`X-CSRFToken` = `csrftoken` cookie) and, when the browser
  sends an `Origin`, it must be one of `CORS_ALLOWED_ORIGINS`.
- Roles: `super_admin` (everything), `content_editor` (content, media, settings), `inquiry_manager` (inquiries). Checks happen in
  `middleware/auth.ts` on the backend; the frontend only hides links.
- Rate limits (per visitor address, honouring `TRUST_PROXY`): whole API, login, inquiry submission.

### Data model (MongoDB collections)
`users`, `sessions`, `auditevents`, `mediaassets`, `servicecategories`, `services` (capabilities embedded), `industries`,
`producttypes`, `technologies`, `projects`, `projectgalleryitems`, `authors`, `blogcategories`, `tags`, `posts`, `siteprofiles`
(one document), `sitesettings`, `cmspages`, `cmssections`, `faqs`, `testimonials`, `teammembers`, `pricingplans`,
`processsteps`, `credibilityitems`, `navigationitems`, `sociallinks`, `legalpages`, `formoptions`, `inquiries`
(notes and status history embedded). References are ObjectIds; deleting a record cleans up what pointed at it
(`afterDelete` hooks). A media file that is still referenced anywhere cannot be deleted (`lib/media-refs.ts` registry).

### Evidence rules enforced by the API
Drafts and unpublished content never appear in public responses. Testimonials need *verified + published*; statistics, awards
and client logos need *verified + published*; project client names, budgets and external links stay hidden unless explicitly
switched on; blog posts scheduled in the future stay hidden until their time.

### Inquiry flow
Validate → ignore honeypot → reject duplicates (same visitor + message within 10 minutes) → **save** → answer the visitor →
send the notification email. A mail failure is recorded on the inquiry (`notification_status`, `notification_error`) and can be
retried by staff; it never loses a submission.

## How to add a feature

1. `src/modules/<feature>/<feature>.model.ts` — Mongoose schema (defaults here, not in zod). Call `registerMediaRefs` if it
   references uploaded files.
2. `<feature>.validation.ts` — zod schema (no `.default()`).
3. `<feature>.router.ts` — export `<feature>PublicRoutes(api)` / `<feature>ManageRoutes(manage)` using `publicRouter` and
   `manageRouter`; put rules in `prepare` (cross-field validation), `afterDelete` (cleanup), `extras` (computed counts).
4. Register the routes in `src/routes/index.ts`.
5. Add tests in `backend/tests/`, document the endpoints in `docs/api.md`, and add the admin screen in
   `frontend/src/features/admin/resources.ts` (declarative) if editors manage it.

## Frontend
Next.js App Router. Public pages render CMS sections (`components/sections`) from `/pages/<slug>`; the admin portal is under
`app/(admin)/admin` and is driven by `features/admin/resources.ts`. `middleware.ts` redirects to the login page when the
`sessionid` cookie is missing (real authorization is the API's job).
