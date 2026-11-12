# Decision log

Short records of decisions that are not obvious from the code. Newest last.

## D-001 — Replace the Django backend with Node.js (Express + Mongoose + MongoDB Atlas)
The Django/PostgreSQL backend was dropped and rebuilt in TypeScript so the whole product is one language and the database is a
managed service (Atlas) instead of a container to look after. The project starts with an empty database, so there is no
data migration. The Next.js frontend stays and keeps working against the same API shapes (see `docs/api.md`).

## D-002 — Keep the cookie names and API shapes
`sessionid` and `csrftoken`, the `/api/v1/` paths, the pagination envelope and the error envelope are unchanged, so the frontend
needed only small edits (ports, wording, id types) and its existing browser tests still pass.

## D-003 — Sessions in MongoDB, CSRF by double submit
Server-side sessions (only a hash of the cookie value is stored) allow immediate sign-out when an account is disabled or its
password changes. CSRF uses the double-submit pattern plus an Origin check. The browser talks to the API same-origin through the
Next.js rewrite, so no cross-domain cookies are needed.

## D-004 — Declarative CRUD engine
Most content types are simple CRUD with rules. `manageRouter` / `publicRouter` (`backend/src/lib`) take a description of a
resource (schema, serializer, filters, hooks) instead of one hand-written controller per type. Features with real workflow
(auth, users, media, inquiries, dashboard) have their own controllers.

## D-005 — No zod `.default()`
Defaults live in the Mongoose schema. A zod default inside a partial PATCH schema would silently overwrite stored values.

## D-006 — Embedded vs referenced data
Service capabilities, inquiry notes and inquiry status history are embedded (they never exist without their parent). Everything
else that is shared is referenced by ObjectId, and `afterDelete` hooks clean up dangling references.

## D-007 — Uploads on a host directory, served by the API
Images are stored under random names in `UPLOAD_DIR` (a host directory mounted into the container) and served by the API at
`/media`. They are public by design (they appear on the public site); a file that is still used anywhere cannot be deleted.
S3-compatible storage can replace the directory later by changing `media.service.ts`.

## D-008 — Origin certificate behind Cloudflare
TLS to the server uses a Cloudflare Origin Certificate (long-lived, nothing to renew), with Cloudflare SSL mode *Full (strict)*.
Switching to Let's Encrypt later does not require code changes.

## D-009 — Public repository, private infrastructure
The repository is public. Server addresses, SSH details, host paths and secrets never enter it; docs use placeholders and the
real values live in private notes and server-side env files.
