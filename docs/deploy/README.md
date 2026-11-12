# Deploying Qmona

Placeholders used below: `<server>` the host, `<deploy-root>` this project's directory on the server, `<gateway-dir>` the shared
reverse proxy's directory, `<release>` a git commit. Real values are kept in private notes, never in this repository.

## What runs where
- `qmona-frontend` (Next.js, port 3000) and `qmona-backend` (API, port 4000) are Docker containers on the shared network
  `proxy`. They publish **no host ports**; the reverse proxy reaches them by container name.
- The database is MongoDB Atlas. Atlas must allow the server's address (Network Access).
- `<deploy-root>/app` — the release (a git clone, replaced on every update).
- `<deploy-root>/.env.production` — secrets, mode 600, **outside** the release.
- `<deploy-root>/data/uploads` — uploaded images, **outside** the release and mounted into the API container.

## First deployment

```bash
# 1. Directories and env file (once)
mkdir -p <deploy-root>/data/uploads && cd <deploy-root>
cp <release>/deploy/.env.production.example .env.production && chmod 600 .env.production   # then fill in every value
#    generate secrets: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 2. Get the exact release
git clone https://github.com/mahdee123/Qmona.git app && cd app && git checkout <release>

# 3. Build and start
docker compose --env-file ../.env.production up -d --build
docker compose ps            # both containers should become healthy

# 4. First admin and default content (once). The password is written to a private file, read it once, delete it.
docker compose exec backend node dist/scripts/create-admin.js --email <email> --username <name> \
    --generate --password-file /tmp/first-admin-password
docker compose exec backend cat /tmp/first-admin-password && docker compose exec backend rm /tmp/first-admin-password
docker compose exec backend node dist/scripts/seed.js

# 5. Reverse proxy: install the site config and the certificate, then validate-and-reload
cp deploy/gateway/qmona.conf <gateway-dir>/conf.d/qmona.conf
cp <origin-cert> <gateway-dir>/ssl/qmona.fullchain.pem ; cp <origin-key> <gateway-dir>/ssl/qmona.privkey.pem ; chmod 600 <gateway-dir>/ssl/qmona.privkey.pem
<gateway-dir>/reload.sh      # runs `nginx -t` first and reloads only if valid

# 6. Cloudflare: DNS records qmona.com, www and api -> the server (proxied); SSL/TLS mode "Full (strict)".
```

`REVALIDATE_SECRET` in the env file is shared by both containers. `NEXT_PUBLIC_SITE_URL`, `MEDIA_ORIGINS` and the backend address are
baked into the website image: rebuild (`--build`) after changing them.

## Update to a new release

```bash
cd <deploy-root>/app && git fetch --tags origin && git checkout <release>
docker compose --env-file ../.env.production up -d --build
docker compose ps
```
The previous images stay on the server until pruned. Record the release commit in `changes.md`.

## Back up
- **Database (Atlas):** enable Atlas backups (continuous/cloud backup) in the Atlas console, or export on demand with
  `mongodump --uri "<MONGODB_URI>" --gzip --archive=qmona-$(date +%F).gz` from any machine allowed by Atlas Network Access.
- **Uploads:** `tar czf qmona-uploads-$(date +%F).tgz -C <deploy-root>/data uploads` (daily; keep copies off the server).
- **Configuration:** keep a copy of `.env.production` in a password manager.

## Restore
```bash
# Database
mongorestore --uri "<MONGODB_URI>" --gzip --archive=qmona-YYYY-MM-DD.gz --drop
# Uploads
docker compose stop backend
tar xzf qmona-uploads-YYYY-MM-DD.tgz -C <deploy-root>/data
docker compose start backend
```
Test a restore into a separate Atlas database at least once.

## Roll back
- **Bad release:** `git checkout <previous-release>` in `<deploy-root>/app`, then `docker compose --env-file ../.env.production up -d --build`.
- **Take the site offline without touching other projects:** delete `<gateway-dir>/conf.d/qmona.conf`, run `<gateway-dir>/reload.sh`,
  then `docker compose down` (never `down -v`; uploads are on the host and Atlas data is untouched).

## Verify after any change
```bash
curl -s https://api.qmona.com/api/v1/health                 # {"status":"healthy","database":"connected",...}
curl -s -o /dev/null -w "%{http_code}\n" https://qmona.com/ # 200
```
Open `/admin`, sign in, upload an image, submit the contact form once and confirm the email arrives. Run the gateway's health
script to confirm the other sites are unaffected.

## Uploads survive replacement
`docker compose up -d --build --force-recreate backend` replaces the container; the files in `<deploy-root>/data/uploads` and the
images on the site are unchanged because they live on the host directory, not in the container.
