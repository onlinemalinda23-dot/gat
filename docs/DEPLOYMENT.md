# Deployment Guide

This document describes how to deploy each component to a cloud/VPS production
environment. The architecture has **no localhost dependency** — every client points at
a configurable API base URL.

---

## Deployment overview

| Component | Runtime | How it's served |
|-----------|---------|-----------------|
| Backend API | Node.js ≥ 18 | Any Node host (VPS + PM2/Nginx, or PaaS like Render/Railway/Fly) |
| PostgreSQL | ≥ 14 | Managed cloud DB (Neon, Supabase, RDS, DO Managed DB) or VPS |
| Admin dashboard | Static build (`dist/`) | Any web server / static host (Nginx, Netlify, S3+CloudFront) |
| Android app | Flutter 3 | Play Store, APK link, or internal distribution |

---

## 1. Database (cloud PostgreSQL)

Choose a managed provider. Set these values on the backend:

```
DB_HOST=db.your-provider.com
DB_PORT=5432
DB_NAME=repair_workshop
DB_USER=app_user
DB_PASSWORD=strong-password
DB_SSL=true
```

Apply the schema from your build machine (or a CI step):

```bash
cd backend
npm run migrate
npm run seed   # only the first time (creates default admin)
```

> `scripts/migrate.js` tracks applied files in `schema_migrations` and is idempotent.

---

## 2. Backend API

### Option A — VPS with PM2 + Nginx (recommended for full control)

```bash
# On the server
git clone <repo> && cd backend
npm ci
cp .env.example .env    # fill in production values
NODE_ENV=production npm run migrate
NODE_ENV=production npm run seed
pm2 start src/server.js --name repair-api
pm2 save && pm2 startup
```

Nginx site config:

```nginx
server {
  listen 80;
  server_name api.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then get an SSL certificate (certbot) for `api.your-domain.com`.

### Option B — Platform as a Service (Render / Railway / Fly)

- Build command: `npm install`
- Start command: `npm start`
- Set all `.env` variables in the platform dashboard.
- Set `HOST=0.0.0.0` (the server already binds to the port from `PORT`).

---

## 3. Admin dashboard

The dashboard is a standard Vite build producing a static `dist/` folder.

```bash
cd dashboard
npm install
VITE_API_BASE_URL=https://api.your-domain.com/api/v1 npm run build
# output: dashboard/dist/
```

Serve the `dist/` folder:

```nginx
server {
  listen 80;
  server_name admin.your-domain.com;
  root /var/www/dashboard/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;   # SPA fallback for client routing
  }
}
```

Set the backend `CORS_ORIGINS` to `https://admin.your-domain.com`.

---

## 4. Android app

The app reads its API base URL from a compile-time define — no source edits:

```bash
cd mobile
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=https://api.your-domain.com/api/v1
# build/app/outputs/flutter-apk/app-release.apk
```

- Distribute via Google Play (upload aab) or host the APK and use the in-app
  version checker (`app_versions` table) to notify users of updates.
- Also enable Firebase Cloud Messaging later by adding `firebase_messaging` and
  registering device tokens in `customer_devices`.

---

## 5. HTTPS everywhere

- Terminate TLS at the edge (Nginx certbot, or the PaaS's TLS).
- Both clients must use `https://` URLs. No code changes are required for this.

---

## 6. Checklist

- [ ] Production `.env` created on the server (JWT_SECRET changed)
- [ ] `DB_SSL=true` for managed cloud DB
- [ ] Migrations applied, seed run once
- [ ] `CORS_ORIGINS` set to the real dashboard domain
- [ ] `VITE_API_BASE_URL` points to `https://api.your-domain.com/api/v1`
- [ ] Android built with `--dart-define=API_BASE_URL=https://...`
- [ ] TLS certificates active on api.* and admin.* domains
- [ ] Backup job scheduled (see README §11)
- [ ] Logs shipped off-host (winston writes `logs/` by default; override transports in prod if needed)

---

## 7. Rollback

- **Backend**: keep the previous release build; `pm2 reload` the old process. Migrations
  are forward-only — see `schema_migrations` for applied state.
- **Database**: restore the latest `pg_dump` snapshot if a bad migration is released.
- **Android**: use Play Store staged rollout / unpublish bad builds.