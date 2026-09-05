# Vehicle Repair Management System

A production-ready, cloud-deployable **Vehicle Repair Management System** for automobile repair workshops.

- **Android app** (Flutter) — for mechanics and store keepers
- **Backend API** (Node.js + Express) — REST, JWT, role-based access
- **Admin web dashboard** (React + Vite) — for the workshop owner
- **Database** (PostgreSQL) — normalized schema with 20+ tables

> Note: The **database layer runs two ways**: a fully embedded PostgreSQL
> (**PGlite**) is used for development with zero installation, and a real
> **PostgreSQL** server for production — selected by one environment variable, no
> code differences. The Flutter SDK is not installed in this workspace runtime, so
> the Android source is complete but must be built on a machine with Flutter;
> everything else is built, tested, and verified here.

---

## 1. Architecture

```
┌───────────────┐      ┌──────────────────┐      ┌──────────────────────┐
│  Android app   │      │   Backend API    │      │  Database layer      │
│  (Flutter)     │─────▶│  Node + Express  │─────▶│  - Dev:  PGlite      │
└───────────────┘  JWT  └──────────────────┘  SQL  │   (embedded, 0 setup)│
┌───────────────┐              │                  │  - Prod: PostgreSQL   │
│   Web admin    │──────────────┘                  └──────────────────────┘
│  (React/Vite)  │      HTTPS / REST
└───────────────┘
```

All three clients talk to the same **versioned REST API** (`/api/v1/...`).
The API base URL is configurable in each client, so the same build can point to a
local dev server or a cloud backend with no code changes — **no localhost hardcoding**.

### Roles
| Role          | Permissions |
|---------------|-------------|
| **admin**      | Everything: reports, stock, users, all modules |
| **mechanic**   | View assigned jobs, update progress, add notes, issue parts |
| **store_keeper**| Manage parts, stock, purchases, suppliers, issue parts |

---

## 2. Folder structure

```
.
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── app.js            # Express app (security, CORS, rate limit, routing)
│   │   ├── server.js         # Bootstrap + graceful shutdown
│   │   ├── config/           # env-based config, DB pool, logger
│   │   ├── controllers/      # HTTP handlers
│   │   ├── middleware/       # auth (JWT), errorHandler
│   │   ├── models/           # domain constants
│   │   ├── routes/           # route modules (all resources)
│   │   ├── services/         # auth, notifications
│   │   ├── utils/            # helpers
│   │   └── validators/       # input validation
│   ├── scripts/              # migrate.js, seed.js
│   └── tests/                # integration + unit tests
│
├── database/
│   ├── migrations/           # 001_initial_schema.sql, 002_estimates_*.sql
│   └── seeds/
│
├── dashboard/                # React (Vite) admin dashboard
│   └── src/
│       ├── components/       # UI kit (Layout, ui.jsx)
│       ├── context/          # AuthContext
│       ├── pages/            # all management screens
│       ├── services/         # API client + interceptors
│       └── utils/            # formatters
│
├── mobile/                   # Flutter Android app
│   └── lib/
│       ├── core/             # api, constants, utils, widgets
│       └── features/         # auth, jobcards, customers, vehicles, inventory, reports, notifications, profile
│
└── docs/                     # deployment & cloud documentation
```

---

## 3. Database

PostgreSQL schema (in `database/migrations/`):

`users, customers, vehicles, job_cards, job_card_parts, labour_charges,
repair_notes, parts, inventory, suppliers, purchases, purchase_items,
estimates, estimate_items, invoices, invoice_items, payments, notifications,
customer_devices, app_versions, repair_history`

The same schema runs on an **embedded PostgreSQL (PGlite)** for development and a
**real PostgreSQL** for production. The driver is chosen by environment
variables, so local work needs **no database installation at all**.

Key behaviors are enforced in the API (inside transactions):

- Adding a part to a job card **deducts inventory** and records a stock transaction.
- Recording a purchase **increases inventory** per item and records transactions.
- Completing a job **builds a repair_history snapshot** for the vehicle.
- Job-card / invoice creation **sends customer notifications** (push placeholder that is provider-ready for FCM, SMS, WhatsApp).

---

## 4. Installation & setup

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14 **only** for production-style setups (development uses the embedded database — nothing to install)
- Flutter ≥ 3 (only to build/run the mobile app)

### 4.0 One-click launch on Windows

```powershell
> .\start-dev.ps1
```

This installs dependencies on first run, creates + seeds the local embedded
database automatically, and opens the **backend** and **admin dashboard** in two
terminal windows. It prints every URL and the demo login, then waits until the
API answers on `http://localhost:8080/health`.

Open the dashboard at **http://localhost:5173** and log in with
`admin@workshop.com` / `Admin@123`.

### 4.1 Backend

```bash
cd backend
cp .env.example .env        # edit DB_DRIVER, JWT_SECRET, etc.
npm install

# Development: embedded database (default, no setup)
npm run migrate
npm run seed

# Production: switch to real PostgreSQL (see README section 5)
#   DB_DRIVER=postgres
#   DATABASE_URL=postgres://user:pass@host:5432/repair_workshop
# (or keep the legacy DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD variables)

# Run (development with reload)
npm run dev
# or production
npm start
```

Seeded default users (password `Admin@123`):
- `admin@workshop.com` (admin)
- `mechanic@workshop.com` (mechanic)
- `store@workshop.com` (store_keeper)

### 4.2 Admin dashboard

```bash
cd dashboard
cp .env.example .env        # set VITE_API_BASE_URL
npm install
npm run dev                 # development (defaults to port 5173)
npm run build               # production build → dashboard/dist/
npm run preview             # preview the production build
```

### 4.3 Android app

```bash
cd mobile
flutter pub get
flutter run                  # dev, uses default API_URL (10.0.2.2 = emulator host)
```

Production build pointing at your cloud backend (no code change):

```bash
flutter build apk --dart-define=API_BASE_URL=https://api.your-domain.com/api/v1
```

---

## 5. Environment variables

### Backend (`backend/.env`)
| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | API port | `8080` |
| `HOST` | Bind address (`0.0.0.0` for cloud) | `0.0.0.0` |
| `API_VERSION` | API prefix | `v1` |
| `DB_DRIVER` | Database driver: `sqlite`/`pglite`/`local` = embedded PGlite; `postgres`/`pg` = PostgreSQL | `sqlite` |
| `DATABASE_URL` | Postgres connection string — setting this (`postgres://…`) overrides `DB_DRIVER` and the legacy `DB_*` vars | |
| `SQLITE_PATH` | Where the embedded database lives (default `backend/.localdb`, `:memory:` supported) | `.localdb` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL connection (production, legacy style) | |
| `DB_SSL` | enable SSL connection (`true` on managed cloud DBs) | `false` |
| `JWT_SECRET` | HMAC secret — **change in production** | |
| `JWT_EXPIRES_IN` | access token TTL | `7d` |
| `CORS_ORIGINS` | allowed dashboard origins (comma-separated) | `https://admin.your-domain.com` |
| `FCM_SERVER_KEY`, `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_PATH` | Firebase push notifications | |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS | |
| `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business | |
| `LOG_LEVEL` | winston log level | `info` |

### Dashboard (`dashboard/.env`)
| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL |

### Mobile (via `--dart-define`)
| Variable | Purpose |
|----------|---------|
| `API_BASE_URL` | Backend API base URL |

---

## 6. API reference (all under `/api/v1`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | health check | public |
| GET | `/app/version` | app update check | public |
| POST | `/auth/login` | login → JWT | public |
| POST | `/auth/register` | create user (admin only in dashboard UI) | public |
| POST | `/auth/refresh` | refresh access token | public |
| GET | `/auth/profile` | current user | auth |
| PUT | `/auth/profile` | update profile | auth |
| PUT | `/auth/change-password` | change password | auth |
| GET/POST | `/customers` | list / create | auth |
| GET/PUT/DELETE | `/customers/:id` | read / update / delete | auth (admin for delete) |
| GET/POST | `/vehicles` | list / create | auth |
| GET | `/vehicles/number/:number` | lookup by plate | auth |
| GET | `/vehicles/model/:brand/:model/history` | **vehicle-model part history** | auth |
| GET/PUT/DELETE | `/vehicles/:id` | read / update / delete | auth |
| GET/POST | `/job-cards` | list / create | auth |
| GET | `/job-cards/:id` | full detail (parts, labour, notes) | auth |
| PUT | `/job-cards/:id/status` | update progress | auth |
| PUT | `/job-cards/:id` | update details | auth |
| POST | `/job-cards/:id/notes` | add repair note | auth |
| POST | `/job-cards/:id/parts` | **issue part (deducts stock)** | auth |
| POST | `/job-cards/:id/labour` | add labour charge | auth |
| DELETE | `/job-cards/:id` | delete | admin |
| GET/POST | `/parts` | list / create | auth (admin/store create) |
| GET | `/parts/low-stock` | low stock warning | auth |
| GET | `/parts/:id` | detail + stock history | auth |
| PUT/DELETE | `/parts/:id` | update / deactivate | admin/store |
| POST | `/parts/:id/add-stock` | increase stock | admin/store |
| POST | `/parts/:id/remove-stock` | decrease stock | admin/store |
| GET/POST | `/suppliers` | list / create | auth |
| GET/PUT/DELETE | `/suppliers/:id` | detail / update / delete | auth/admin |
| GET/POST | `/suppliers/purchases` | list / **record purchase (+stock)** | auth (admin/store create) |
| GET | `/suppliers/purchases/:id` | purchase detail | auth |
| GET/POST | `/estimates` | list / create from job card | auth |
| PUT | `/estimates/:id` | approve/reject | auth |
| DELETE | `/estimates/:id` | delete | auth |
| GET/POST | `/invoices` | list / create | auth |
| GET | `/invoices/:id` | full invoice (items + payments) | auth |
| POST | `/invoices/:id/payments` | record payment | auth |
| DELETE | `/invoices/:id` | delete | admin |
| GET | `/reports/daily` | daily report | admin |
| GET | `/reports/monthly` | monthly report | admin |
| GET/PUT/DELETE | `/users` | user management | admin |
| GET | `/notifications` | notification log | auth |

---

## 7. Cloud deployment

Full cloud guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

Summary for a typical cloud setup (e.g. a VPS or PaaS):

1. **Database** — provision managed PostgreSQL (e.g. Neon, Supabase, RDS, DigitalOcean).
   Set `DB_DRIVER=postgres` (or `DATABASE_URL`), `DB_SSL=true`, strong credentials in the backend env.
2. **Backend** — deploy to any Node host (Render, Railway, Fly, Dokku, a VPS with PM2/Nginx).
   Build with the `npm start` entrypoint; bind `HOST=0.0.0.0`; set `CORS_ORIGINS` to your dashboard domain.
3. **Admin dashboard** — `cd dashboard && npm run build`, serve the `dist/` folder from any web server.
4. **Android app** — build APK with `--dart-define=API_BASE_URL=<your api>`; push via Play Store or APK distribution.
5. **HTTPS** — terminate TLS in Nginx/a PaaS proxy; clients always use `https://`.

There is **no localhost dependency** in the deployed architecture.

---

## 8. Automatic app updates

- Backend exposes `GET /app/version?platform=android`.
- Admins manage rows in the `app_versions` table: `latest_version`, `min_version`,
  `update_url`, `force_update`, `release_notes`.
- On launch the Android app calls this endpoint. If a newer version is available it
  shows **“New version available”**; if `force_update` is true (or the installed build is
  below `min_version`) the app blocks until the user updates.
- This still uses a normal Play Store / APK update mechanism for the actual code change —
  it is a **check**, not a runtime code rewrite. Backend and configuration changes take
  effect without reinstalling the app.

---

## 9. Notifications (provider-ready)

The `notificationService` persists every message to the `notifications` table and is
structured so real providers can be attached without changing callers:

- **Push**: `sendPushNotification(...)` — placeholder for Firebase Cloud Messaging (admin SDK / server key).
- **SMS**: `sendSMS(...)` — Twilio-ready via `TWILIO_*` env vars.
- **WhatsApp**: `sendWhatsApp(...)` — WhatsApp Business API via `WHATSAPP_*` env vars.

Customer device tokens are stored in `customer_devices` for FCM delivery.
Status changes fire notifications automatically (vehicle received, in progress, waiting for parts, completed, ready/delivered).

---

## 9.1 Security

- Passwords hashed with `bcryptjs` (12 rounds).
- JWT access + refresh tokens; role-based `authorize(...)` middleware.
- All SQL via parameterized queries (injection-safe).
- Input validation on every write route (`express-validator`, 422 on failure).
- `helmet`, CORS allow-listing in production, rate limiting on public routes.
- Central error handler — no stack traces leaked to clients.
- Secrets only via environment variables (never hardcoded).

---

## 10. Running the full stack locally (development)

**No PostgreSQL installation required.**

- **Easiest:** run `.\start-dev.ps1` (Windows) — see section 4.0. Everything
  (database, migrations, seed, backend, dashboard) is started automatically.
- **Manual:**
  1. `cd backend && npm install && npm run migrate && npm run seed && npm run dev`
     → API on http://localhost:8080
  2. `cd dashboard && npm install && npm run dev` → http://localhost:5173
  3. `cd mobile && flutter pub get && flutter run`
  4. Log in with `admin@workshop.com` / `Admin@123` on either client.

The local embedded database is a single folder (`backend/.localdb`) — you can
delete it at any time and re-run `npm run migrate && npm run seed` to start fresh.

---

## 11. Backups & restore

**Production (PostgreSQL):**

```bash
# Backup
pg_dump -U <user> -h <host> repair_workshop -F c -f repair_$(date +%F).dump

# Restore
pg_restore -U <user> -h <host> -d repair_workshop -c repair_<date>.dump
```

**Local development (embedded):** back up the whole `backend/.localdb/` folder
(or copy the DB files while the backend is stopped), or simply re-seed a fresh
one with `npm run migrate && npm run seed`.

Set up periodic backups through your database provider or a cron job.

---

## 12. Versioning and future updates

- **API versioning**: routes mounted under `/api/v1/...`; a future v2 is additive.
- **Cached config**: environment variables allow backend behavior changes without code edits.
- **Backend feature updates** require no app reinstall (the app is thin over HTTP).
- **Android code updates** go through the standard Play Store / APK channel, assisted by the built-in version check.
- Migrations are versioned and idempotent via `schema_migrations`.

---

## 13. Contributing / conventions

- Controllers stay thin; business logic in services; data access via parameterized SQL.
- Reusable UI (dashboard `components/ui.jsx`, mobile `core/widgets`) for consistency.
- Field inputs are validated server-side regardless of client checks.
- Run `backend: npm test && npm run smoke` and `dashboard: npm run build` before committing.