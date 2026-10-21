# IDOP / AVAN — Industrial Digital Operations Platform

Platform for managing industrial parks (AVAN). Monorepo layout:

| Directory | Contents |
|---|---|
| `backend/` | NestJS API (TypeScript, Prisma/PostgreSQL, Redis, BullMQ, MQTT, MinIO) — listens on `:3000`, global prefix `api/v1` |
| `Frontend/` | Vite + React SPA (served by nginx in production, Vite dev server in development) |
| `docker-compose.yml` | Production topology: postgres, redis, mqtt, minio, backend, frontend (nginx) |
| `docs/` | Diagnostics, reconstruction status, **[deployment guide](docs/DEPLOYMENT.md)** |

---

## Quickstart

Two supported paths. Pick one — do not mix a native backend with the
dockerized frontend unless you know what you are doing (cookies are
same-origin by design).

### Path A — Native development (no Docker)

Prereqs: Node 20+, a PostgreSQL instance, a **real Redis** (required — JWT
blacklist checks fail without it; no shim is used), optional MQTT/MinIO.

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env            # then edit: DATABASE_URL, REDIS_*, JWT_* (>=32 chars, distinct)
npx prisma generate
npx prisma migrate deploy       # apply DB schema
npm run build                   # compiles TypeScript -> dist/
node dist/main                  # production entrypoint, http://localhost:3000
#   (hot-reload alternative: npm run start:dev)
# Optional first-run seed (set a strong ADMIN_PASSWORD, never the default):
DATABASE_URL=... ADMIN_PASSWORD=... node scripts/seed-admins.js

# 2) Frontend (second terminal)
cd Frontend
npm install
cp .env.example .env            # VITE_USE_MOCKS must stay false for real data
npm run dev                     # http://localhost:5173, proxies /api -> :3000
```

Sanity checks:

```bash
curl http://localhost:3000/api/v1/health           # raw: {"status":"ok",...}
curl http://localhost:3000/api/v1/health/detailed  # enveloped: DB + Redis ping
```

### Path B — docker-compose (production-shaped)

Prereqs: Docker Engine + Compose v2 plugin.

```bash
cp .env.production.template .env   # then replace EVERY REPLACE_WITH_... value
                                   # (generate secrets: openssl rand -hex 32)
docker compose config              # validate
docker compose up -d --build       # build images + start
docker compose ps                  # all six services healthy/running
docker compose logs -f backend

# First run: apply DB schema from the host, then seed (see docs/DEPLOYMENT.md §8)
cd backend && npm install && npx prisma migrate deploy   # Prisma CLI is pruned from the image

# Open the app
#   http://localhost/                 (nginx -> SPA, /api proxied to backend)
curl http://localhost/api/v1/health   # same raw health JSON via the proxy
```

Teardown: `docker compose down` (keeps data volumes; `down -v` deletes them).

> **Verification status:** Docker is not installed on the current development
> machine, so the Path B commands above have **not** been executed here — they
> are documented for a Docker-capable host together with the full healthcheck,
> cookie/CSRF and rollback checklist in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Authentication model (both paths)

- Access token: JWT held in memory (frontend), `Authorization: Bearer …`.
- Refresh token: **HttpOnly** cookie `idop_refresh`, `Path=/api/v1/auth`,
  `SameSite=Strict`.
- CSRF: readable `idop_csrf` cookie must be echoed as header `X-CSRF-Token`
  on state-changing requests that carry the refresh cookie (double-submit).
- Frontend and backend are **same-origin** by design (dev: Vite `/api` proxy;
  prod: nginx `/api` proxy) — always reach the app through the frontend origin
  so the cookie path matches.

---

## Documentation

The audit trail for the reconstruction work is six step reports. They are
written to be self-contained and evidence-tied: each one states what was read
before anything was changed, what was changed, what was deliberately left
alone and why, and the gate results that back the claim. Read them in order.

| Report | Covers |
| --- | --- |
| [`docs/step1-diagnostic-report.md`](docs/step1-diagnostic-report.md) | Step 1 — diagnosis of the original state and the defect backlog |
| [`docs/step2-3-persistence-fix-report.md`](docs/step2-3-persistence-fix-report.md) | Steps 2–3 — persistence and API-layer fixes |
| [`docs/STEP6-REPORT.md`](docs/STEP6-REPORT.md) | Step 6 — the first three finance ERP extension groups |
| [`docs/STEP7-REPORT.md`](docs/STEP7-REPORT.md) | Step 7 — the remaining four endpoint groups, plus a bounded cut in the routed `tsc` debt |
| [`docs/STEP8-REPORT.md`](docs/STEP8-REPORT.md) | Step 8 — seeding the finance permission keys so real roles can use the endpoints |
| [`docs/FINAL-REPORT.md`](docs/FINAL-REPORT.md) | Overall result, residual risks, GO conditions, and a per-step addendum for what each later step closed |

Supporting material, not reports:

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deployment, healthcheck, cookie/CSRF and rollback checklist.
- `docs/tsc-baseline.txt` — the front-end `tsc` ratchet baseline. Generated by
  `node Frontend/scripts/tsc-ratchet.mjs --update`; **never edit it by hand**.
- `Frontend/scripts/routed-closure.mjs` — computes which front-end files are
  reachable from a routed screen, so the `tsc` work list is derived rather than
  assumed.

`fix*.md` and `.gate/` are deliberately **not** in the repository: they are the
per-step working spec and the run evidence for one session, superseded by the
reports above. See `.gitignore`.
