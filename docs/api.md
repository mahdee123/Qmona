# API — `/api/v1/`

Base path `/api/v1/`. JSON. The browser reaches it through the website (`https://qmona.com/api/v1/...`); `https://api.qmona.com/api/v1/...`
serves the same API directly. Uploaded images are served from `/media/...` on the API origin.

## Conventions
- **Trailing slashes** are accepted but not required (`/services/` and `/services` are the same route).
- **Auth:** httpOnly cookie `sessionid` (set by login). Unsafe methods (`POST`, `PATCH`, `DELETE`) also need the header
  `X-CSRFToken` equal to the `csrftoken` cookie; call `GET /auth/csrf/` first to receive the cookie. A browser `Origin`, when sent,
  must be a site origin.
- **Errors** (every endpoint): `{ "detail": "human message", "code": "machine_code", "errors": { "field": ["message"] } }`
  - `400` validation (`validation_error`) · `403` not signed in (`not_authenticated`) or not allowed (`permission_denied`,
    `csrf_failed`) · `404` · `409` conflict (`media_in_use`) · `413` too large · `429` throttled (`throttled`).
- **Pagination** (paginated lists): `{ count, total_pages, page, page_size, next, previous, results }` with `?page=` and
  `?page_size=` (max 100, default 12). A page past the end is `404`. Small lists (taxonomies, navigation, FAQs...) are plain arrays.
- **IDs** are 24-character hex strings. **Money** values (`price_amount`, `budget_*`) are strings with two decimals.
- **Rate limits** per visitor address: 300 requests/min overall, 10 login attempts/min, 10 inquiries/hour.

## Public (no auth, published/active data only)

| Method & path | Notes |
|---|---|
| GET `/health` | `{ status, database, version, timestamp }` (503 when the database is down) |
| GET `/site` | profile, navigation (header/footer groups), socials, published legal pages, availability flags |
| GET `/pages/{slug}` | published page with **active** sections; media ids resolved to `{ id, url, alt_text, caption, width, height, mime_type }`; each section carries `style` presets |
| GET `/services` (`?featured=true`), `/services/{slug}` | active services |
| GET `/service-categories`, `/industries`, `/industries/{slug}`, `/product-types`, `/technologies` | active taxonomies |
| GET `/projects` | **published only**; filters `services`, `industries`, `product_types`, `technologies` (comma-separated slugs; OR within a group, AND across), `search`, `featured`, `page`, `page_size` |
| GET `/projects/{slug}`, `/projects/{slug}/related` | client name masked when hidden; `budget` null unless allowed; `external_links` null unless allowed |
| GET `/blog/posts` (`category`, `tag`, `search`, `featured`), `/blog/posts/{slug}`, `/blog/posts/{slug}/related`, `/blog/categories` | published and not scheduled in the future |
| GET `/faqs` (`home=true`, `service`, `category`), `/testimonials`, `/team`, `/pricing`, `/process`, `/credibility` | evidence-gated (see architecture) |
| GET `/legal`, `/legal/{slug}` | published legal pages |
| GET `/forms/options` | managed form options + services/industries/product types for the selects |
| POST `/inquiries` | contact or support submission. Body: `inquiry_type` (`contact`/`support`), `full_name`, `email`, `company?`, `phone_country_code?`, `phone?`; contact: `topic`, `service?`, `industry?`, `product_type?`, `project?`, `budget?`, `timeline?`; support: `subject`, `support_category`, `project_reference_text?`; `contact_method?`, `message` (10–5000), `privacy_acknowledged: true`, `source_page?`, `hp_website` (honeypot, leave empty). Select values are option values/slugs, or `other` / `not-sure`. → `201 { detail, reference, duplicate: false }`; the same message again within 10 minutes → `200 { …, duplicate: true }` |

## Auth

| Method & path | Notes |
|---|---|
| GET `/auth/csrf` | sets the `csrftoken` cookie, returns `{ detail, csrfToken }` |
| POST `/auth/login` | `{ username_or_email, password }` → `{ detail, user }`; sets `sessionid` |
| POST `/auth/logout` | signs out |
| GET `/auth/me` | current user with `capabilities` |
| GET/POST `/auth/users`, GET/PATCH `/auth/users/{id}`, POST `/auth/users/{id}/set-password` | **Super Admin**. No DELETE: accounts are deactivated (`is_active: false`). Passwords: at least 10 characters, not all digits, not common, not similar to the username/email |

There is no public registration, password reset by email, email verification or external sign-in provider. A Super Admin sets
passwords; the first account is created on the server with `npm run create-admin`.

## Management — `/manage/…` (signed in, role-checked)

Standard resources support `GET` (list, `?search=`, filters), `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, and
`POST /{resource}/reorder` with `{ "ids": [...] }` where the resource is orderable. Every write is audited and refreshes the website cache.

| Resources | Role |
|---|---|
| `services`, `service-categories`, `industries`, `product-types`, `technologies`, `projects` (filters `publication_status`, `delivery_status`, `featured`, tag filters as public), `project-gallery` (`?project=`), `blog/posts` (`status`, `author`), `blog/authors`, `blog/categories`, `blog/tags`, `pages` (**by slug**), `sections` (`?page_slug=`), `settings` (**by key**), `faqs`, `testimonials`, `team`, `pricing`, `process`, `credibility`, `navigation`, `socials`, `legal`, `form-options`, `media` | Content Editor |
| `media`: `POST` multipart (field `file`, optional `title`, `alt_text`, `caption`); PNG, JPEG, WebP or sanitised SVG up to 10 MB; type is read from the content; `PATCH` metadata only; `DELETE` → `409 media_in_use` (with `references`) while the file is used | Content Editor |
| GET/PATCH `/site-profile`, GET `/section-schemas`, GET `/preview/{project\|post\|service\|legal\|page}/{slug}` | Content Editor |
| `inquiries` (filters `inquiry_type`, `status`, `is_read`, `archived` = false/true/all, `assigned_to` = id/me/none, `service`, `industry`, `notification_status`, `date_from`, `date_to`, `search`); `PATCH` (`assigned_to`, `is_read`, `is_archived`); `POST /{id}/notes`, `/{id}/status`, `/{id}/retry-notification`; `DELETE /{id}?confirm=<reference>`; `GET /export` (CSV, formula-escaped); `GET /assignees` | Inquiry Manager |
| GET `/dashboard` | any role (sections depend on role) |
| GET `/audit-events` | Super Admin |

Business rules enforced here: testimonials and credibility claims cannot be published unverified; navigation allows one level of
nesting in the header only; section content and `style` are validated against the section type's schema; deleting a taxonomy
entry removes it from projects; a project's budget minimum cannot exceed its maximum.

## Differences from the earlier Django API
- IDs are ObjectId strings instead of integers/UUIDs.
- `service-capabilities` is gone: capabilities are embedded in a service and written with `capability_titles` (as the admin already did).
- No OpenAPI/Swagger endpoints (`/schema`, `/docs`); this document is the contract.
- `is_superuser` in user objects is simply `role === super_admin`.
- Dates in legal pages are plain `YYYY-MM-DD`; animation `duration`/`delay` in the management API are strings with two decimals, as before.
