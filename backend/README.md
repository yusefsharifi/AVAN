# IDOP Backend

Industrial Digital Operations Platform — Backend

## Tech Stack

- **Runtime:** Node.js 20 + TypeScript
- **Framework:** NestJS 10 (modular architecture)
- **Database:** PostgreSQL 16 (Prisma 5 ORM)
- **Cache:** Redis 7 (ioredis)
- **Auth:** JWT (RS256) + RBAC + 2FA (TOTP)
- **Queue:** BullMQ (Redis-backed)
- **Real-time:** Socket.io (zone-based namespaces)
- **IoT:** MQTT (barrier/ANPR integration)
- **Docs:** Swagger / OpenAPI 3.1
- **Testing:** Jest + Supertest

## Modules Implemented

### M1: Auth & User Management
- Registration with phone verification (OTP)
- Login with JWT (access 15min + refresh 7d)
- 2FA (TOTP with otplib)
- Password reset flow
- Account lockout (exponential backoff)
- Role hierarchy (SUPER_ADMIN → DRIVER)
- Session management with token rotation
- User CRUD with avatar upload
- Permissions system
- Impersonation (SUPER_ADMIN)

### M2: Zone & Company Onboarding
- Zone CRUD with settings
- Company registration & lifecycle
- 6-step onboarding workflow
- Plot management & allocation
- Document management with MinIO
- Contact management
- Health score computation
- Zone statistics & working hours
- Gate management
- Holiday management

### M3: Guard Portal & Gate Control
- Vehicle entry/exit processing
- ANPR camera integration
- QR code scanning (universal)
- Barrier control via MQTT
- Manual override with audit
- Blacklist management
- Guard shift management
- Incident reporting
- Live dashboard
- Traffic statistics
- Overstay alerts

## Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev

# Run tests
npm test

# View API docs
open http://localhost:3000/api/docs
```

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # All models & enums
├── src/
│   ├── main.ts                 # NestJS bootstrap
│   ├── app.module.ts           # Root module
│   ├── common/
│   │   ├── constants/          # Error codes
│   │   ├── decorators/         # @CurrentUser, @Roles, @ZoneId
│   │   ├── dto/                # Response & pagination DTOs
│   │   ├── exceptions/         # AppException
│   │   ├── filters/            # Global exception filter
│   │   ├── guards/             # JWT, Roles, Zone, Company
│   │   ├── services/           # AuditService
│   │   └── utils/              # Plate normalizer, QR gen, Redis keys
│   ├── gateway/
│   │   └── idop.gateway.ts     # Socket.io gateway
│   ├── mqtt/
│   │   └── mqtt.service.ts     # MQTT for IoT barrier control
│   ├── redis/
│   │   └── redis.service.ts    # Redis wrapper
│   ├── bull/
│   │   └── bull.service.ts     # BullMQ wrapper
│   ├── prisma/
│   │   └── prisma.service.ts   # Prisma client
│   └── modules/
│       ├── auth/               # M1: Authentication
│       ├── users/              # M1: User management
│       ├── zones/              # M2: Zone management
│       ├── companies/          # M2: Company onboarding
│       ├── plots/              # M2: Plot management
│       ├── guard-portal/       # M3: Guard terminal
│       ├── vehicles/           # M3: Vehicle management
│       ├── blacklist/          # M3: Blacklist
│       └── traffic/            # M3: Traffic logs
└── test/                       # E2E tests
```

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | /register | Register new user |
| POST | /login | Login |
| POST | /refresh | Refresh tokens |
| POST | /logout | Logout |
| POST | /logout-all | Logout all devices |
| POST | /send-otp | Send OTP |
| POST | /verify-otp | Verify OTP |
| POST | /forgot-password | Request password reset |
| POST | /reset-password | Reset password |
| GET | /me | Get profile |
| PATCH | /me | Update profile |
| PATCH | /me/password | Change password |
| POST | /me/2fa/enable | Enable 2FA |
| POST | /me/2fa/confirm | Confirm 2FA |
| DELETE | /me/2fa | Disable 2FA |
| GET | /me/sessions | Active sessions |
| DELETE | /me/sessions/:id | Revoke session |

### Users (`/api/v1/users`)
| Method | Path | Description |
|--------|------|-------------|
| POST | / | Create user |
| GET | / | List users |
| GET | /:id | Get user |
| PATCH | /:id | Update user |
| DELETE | /:id | Soft delete |
| POST | /:id/suspend | Suspend |
| POST | /:id/reactivate | Reactivate |
| POST | /:id/avatar | Upload avatar |
| GET | /:id/sessions | Active sessions |
| DELETE | /:id/sessions/:sid | Revoke session |
| POST | /:id/permissions | Grant permission |
| DELETE | /:id/permissions/:perm | Revoke permission |
| POST | /impersonate/:id | Impersonate |

### Zones (`/api/v1/zones`)
Full CRUD + settings, holidays, gates, statistics, working hours check.

### Companies (`/api/v1/companies`)
Full CRUD + onboarding, plot allocation, documents, contacts, health score.

### Plots (`/api/v1/plots`)
Full CRUD + map data, occupancy stats, available plots.

### Guard Portal (`/api/v1/guard`)
Entry/exit, ANPR, QR scan, barrier, override, incidents, shifts, dashboard.

### Vehicles (`/api/v1/vehicles`)
Registration, lookup, permits, traffic history.

### Blacklist (`/api/v1/blacklist`)
Add, list, check, remove.

### Traffic (`/api/v1/traffic`)
Logs, statistics.

## Socket.io Events

| Event | Room | Description |
|-------|------|-------------|
| traffic:entry | gate:{id}, zone:{id} | Vehicle entered |
| traffic:exit | gate:{id}, zone:{id} | Vehicle exited |
| traffic:denied | gate:{id}, zone:{id} | Entry denied |
| traffic:override | zone:{id} | Manual override |
| barrier:opened | gate:{id} | Barrier opened |
| barrier:closed | gate:{id} | Barrier closed |
| anpr:detected | gate:{id} | Plate detected |
| anpr:needs-review | gate:{id} | Low confidence |
| company:registered | zone:{id} | New applicant |
| company:activated | zone:{id} | Company active |
| incident:reported | zone:{id} | Gate incident |
| guard:shift:started | zone:{id} | Shift started |
| guard:shift:ended | zone:{id} | Shift ended |

## Redis Keys & TTLs

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| auth:blacklist:{jti} | 15 min | Blacklisted tokens |
| auth:otp:{phone}:{purpose} | 5 min | OTP tracking |
| user:profile:{userId} | 5 min | Profile cache |
| zone:settings:{zoneId} | 10 min | Settings cache |
| zone:stats:{zoneId} | 1 min | Stats cache |
| vehicle:lookup:{zoneId}:{plate} | 2 min | Plate lookup |
| blacklist:{zoneId}:{value} | 5 min | Blacklist check |
| gate:barrier:{gateId} | 5 min | Device status |
| guard:dashboard:{gateId} | 10 sec | Live dashboard |
