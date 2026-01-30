# Bedrock C3PAO - Standalone Assessment Client

## Overview

The standalone C3PAO application is a **thin assessment client** deployed as a Docker container inside a C3PAO's government-approved VDI. It connects to the Bedrock CMMC SaaS platform via API to pull engagement and OSC data, and stores all assessment work locally in SQLite.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   AWS Cloud (SaaS)                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │            Bedrock CMMC Platform                    │  │
│  │                                                     │  │
│  │  - OSC self-assessment & compliance                 │  │
│  │  - C3PAO Marketplace                                │  │
│  │  - C3PAO org management & subscriptions             │  │
│  │  - Engagement lifecycle (request → accept)          │  │
│  │  - Instance health/connectivity monitoring          │  │
│  │  - API endpoints for standalone instances           │  │
│  │                                                     │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │ REST API (HTTPS)                │
└─────────────────────────┼───────────────────────────────┘
                          │
                          │  Pulls: engagements, OSC data,
                          │         controls, evidence, STIGs
                          │
                          │  Pushes: assessment findings,
                          │          reports, status updates
                          │
┌─────────────────────────┼───────────────────────────────┐
│    Government-Approved VDI (C3PAO Customer)              │
│                         │                                │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │          Bedrock C3PAO Container                    │  │
│  │                                                     │  │
│  │  ┌─────────────┐  ┌────────────────────────────┐   │  │
│  │  │   Next.js    │  │   SQLite (local only)      │   │  │
│  │  │   App        │  │                            │   │  │
│  │  │             │  │  - Assessment findings      │   │  │
│  │  │  - Login     │  │  - Cached engagement data  │   │  │
│  │  │  - Dashboard │  │  - eMASS export data       │   │  │
│  │  │  - Assess    │  │  - Sync state/queue        │   │  │
│  │  │  - Report    │  │  - Session data            │   │  │
│  │  │  - Export    │  │                            │   │  │
│  │  └─────────────┘  └────────────────────────────┘   │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## What Lives Where

### SaaS Platform (Source of Truth)
- OSC customer accounts and organization data
- ATO packages, SSPs, evidence, POA&Ms
- NIST 800-171 controls and objectives
- STIG checklists and benchmarks
- C3PAO organization profiles, users, subscriptions
- C3PAO Marketplace listings and reviews
- Engagement lifecycle management (request, proposal, accept)
- Instance registry and health monitoring

### Standalone Client (Local Assessment Work)
- Cached copy of engagement data (read from SaaS API)
- Cached copy of OSC package data needed for assessment
- **Assessment findings** (the assessor's actual work)
- **Assessment reports** (generated locally)
- **eMASS export data** (generated locally)
- Sync queue (pending pushes back to SaaS)
- Local session/auth cache

---

## API Contract (SaaS ↔ Standalone)

### Authentication
The standalone authenticates to the SaaS using an **instance API key** issued when the C3PAO registers their self-hosted instance. Individual assessors still log in with their C3PAO credentials, validated against the SaaS.

```
POST /api/v1/instance/authenticate
  Body: { instanceKey, assessorEmail, assessorPassword }
  Returns: { token, assessor, c3pao, expiresAt }
```

### Pull Endpoints (SaaS → Standalone)

```
GET  /api/v1/instance/engagements
     → List of engagements assigned to this C3PAO

GET  /api/v1/instance/engagements/:id
     → Full engagement detail with OSC package data

GET  /api/v1/instance/engagements/:id/controls
     → All controls/requirements in scope for this engagement

GET  /api/v1/instance/engagements/:id/evidence
     → Evidence artifacts uploaded by the OSC

GET  /api/v1/instance/engagements/:id/poams
     → POA&M items for this engagement

GET  /api/v1/instance/engagements/:id/stigs
     → STIG checklists and targets

GET  /api/v1/instance/engagements/:id/team
     → Assessor team assignments

GET  /api/v1/instance/reference/nist-controls
     → NIST 800-171 reference data (cacheable)

GET  /api/v1/instance/reference/cmmc-levels
     → CMMC level mappings (cacheable)
```

### Push Endpoints (Standalone → SaaS)

```
POST /api/v1/instance/engagements/:id/findings
     → Submit/update assessment findings

POST /api/v1/instance/engagements/:id/findings/bulk
     → Bulk sync findings (for batch upload)

POST /api/v1/instance/engagements/:id/report
     → Submit assessment report

POST /api/v1/instance/engagements/:id/status
     → Update engagement status (e.g., mark complete)

POST /api/v1/instance/heartbeat
     → Health check / connectivity ping (called periodically)
```

### SaaS Instance Management Endpoints (Admin)

```
POST   /api/v1/admin/instances
       → Register a new standalone instance for a C3PAO

GET    /api/v1/admin/instances
       → List all registered instances with health status

GET    /api/v1/admin/instances/:id
       → Instance detail (last heartbeat, sync status, version)

DELETE /api/v1/admin/instances/:id
       → Revoke instance access

POST   /api/v1/admin/instances/:id/rotate-key
       → Rotate instance API key
```

---

## Standalone Project Structure

```
bedrock-c3pao/
├── app/
│   ├── layout.tsx                      # Root layout (C3PAO branding)
│   ├── page.tsx                        # Redirect → /login or /dashboard
│   ├── login/page.tsx                  # Assessor login (validates via SaaS API)
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Auth guard + C3PAO nav + sync status
│   │   ├── page.tsx                    # Dashboard home
│   │   ├── engagements/
│   │   │   ├── page.tsx                # Engagement list (from cache/API)
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Engagement detail
│   │   │       ├── control/
│   │   │       │   └── [controlId]/
│   │   │       │       └── page.tsx    # Individual control assessment
│   │   │       ├── report/page.tsx     # Assessment report
│   │   │       ├── stigs/
│   │   │       │   ├── page.tsx        # STIG checklist view
│   │   │       │   └── [targetId]/
│   │   │       │       └── page.tsx    # STIG target assessment
│   │   │       └── emass-export/
│   │   │           └── page.tsx        # eMASS export wizard
│   │   ├── profile/page.tsx            # Assessor profile
│   │   ├── team/page.tsx               # Team view (read-only from SaaS)
│   │   └── workload/page.tsx           # Workload dashboard
│   ├── actions/                        # Server actions
│   │   ├── auth.ts                     # Login/logout via SaaS API
│   │   ├── engagements.ts             # Fetch & cache engagements
│   │   ├── assessment.ts              # Save findings (local + sync)
│   │   ├── sync.ts                     # Sync engine actions
│   │   ├── export.ts                   # eMASS/Excel export
│   │   └── team.ts                     # Team data
│   └── api/
│       └── health/route.ts             # Container health check
│
├── components/
│   ├── c3pao/                          # All 23 C3PAO view components
│   ├── ui/                             # shadcn/ui base components
│   ├── shared/                         # Shared components
│   ├── evidence/                       # Evidence viewer
│   ├── poam/                           # POA&M viewer
│   ├── stig/                           # STIG viewer
│   ├── sync-status.tsx                 # Sync indicator in nav bar
│   └── assessment-mode-banner.tsx
│
├── lib/
│   ├── api-client.ts                   # SaaS API client (fetch wrapper)
│   ├── auth.ts                         # Session management (local JWT)
│   ├── auth-edge.ts                    # Edge auth for middleware
│   ├── db.ts                           # SQLite client (better-sqlite3)
│   ├── sync-engine.ts                  # Background sync logic
│   ├── cache.ts                        # Cache read/write helpers
│   ├── s3-proxy.ts                     # Proxy evidence downloads from SaaS
│   ├── utils.ts                        # Utility functions
│   ├── utils/                          # Utility modules
│   ├── types/                          # TypeScript types
│   ├── data/                           # Static NIST/CMMC reference data
│   ├── stig/                           # STIG processing
│   └── cmmc/                           # CMMC utilities
│
├── db/
│   ├── schema.sql                      # SQLite schema
│   └── migrations/                     # SQLite migrations
│
├── middleware.ts                        # Auth check (all routes except /login)
│
├── Dockerfile                          # Multi-stage production build
├── docker-compose.yml                  # Single-container + volume
├── .env.example                        # Documented config
├── .dockerignore
├── next.config.ts                      # Standalone output mode
└── package.json
```

---

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1.1 Configure Next.js for Standalone Build
- Update `next.config.ts`: `output: 'standalone'`, image optimization for self-hosted, 50MB body limit

#### 1.2 Install Dependencies
From `bedrock-cmmc` carry over only what the standalone needs:
- **Auth**: `jose`, `bcryptjs`
- **Database**: `better-sqlite3` (not Prisma, not Postgres)
- **UI**: all `@radix-ui/*` packages, `recharts`, `sonner`, `lucide-react`
- **Forms**: `zod`, `react-hook-form`, `@hookform/resolvers`
- **PDF**: `@react-pdf/renderer`
- **Excel**: `xlsx`
- **Doc parsing**: `mammoth`, `pdf-parse`
- **2FA**: `speakeasy`, `qrcode`

**Not needed** (handled by SaaS): `@prisma/client`, `prisma`, `@prisma/adapter-neon`, `@aws-sdk/*`, `nodemailer`

#### 1.3 Set Up SQLite Schema
```sql
-- Local assessment data (the assessor's work product)
CREATE TABLE assessment_findings (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    control_id TEXT NOT NULL,
    assessor_id TEXT NOT NULL,
    determination TEXT,              -- NOT_ASSESSED, MET, NOT_MET, N/A
    assessment_methods TEXT,         -- JSON: [INTERVIEW, EXAMINE, TEST]
    finding_text TEXT,
    objective_evidence TEXT,
    deficiency TEXT,
    recommendation TEXT,
    risk_level TEXT,
    version INTEGER DEFAULT 1,
    synced_at TEXT,                   -- NULL = not yet synced to SaaS
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE assessment_reports (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    report_data TEXT,                -- JSON blob
    status TEXT DEFAULT 'DRAFT',
    synced_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Cached data from SaaS (read-only mirror)
CREATE TABLE cached_engagements (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,               -- JSON blob of full engagement
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cached_controls (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data TEXT NOT NULL,               -- JSON blob
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cached_evidence (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    data TEXT NOT NULL,               -- JSON blob (metadata, not files)
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cached_reference_data (
    key TEXT PRIMARY KEY,             -- e.g., 'nist-controls', 'cmmc-levels'
    data TEXT NOT NULL,               -- JSON blob
    fetched_at TEXT DEFAULT (datetime('now'))
);

-- Sync queue
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,        -- 'finding', 'report', 'status'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,             -- 'create', 'update'
    payload TEXT NOT NULL,            -- JSON
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Local session
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    assessor_id TEXT NOT NULL,
    assessor_data TEXT NOT NULL,       -- JSON
    token TEXT NOT NULL,               -- SaaS API token
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

#### 1.4 Environment Configuration
```env
# SaaS Connection (required)
SAAS_API_URL=https://cmmc.foxxcyber.com/api/v1/instance
INSTANCE_API_KEY=<issued-by-saas-on-registration>

# Authentication
AUTH_SECRET=<generate-a-secure-random-string>

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production

# Sync
SYNC_INTERVAL_MS=30000              # Background sync every 30s
CACHE_TTL_MS=300000                  # Cache expires after 5 min
```

---

### Phase 2: SaaS API Client & Sync Engine

#### 2.1 API Client (`lib/api-client.ts`)
A typed fetch wrapper for all SaaS communication:
- Attaches `Authorization: Bearer <instanceKey>` + assessor token headers
- Handles 401 (re-auth), 429 (rate limit backoff), network errors
- Returns typed responses matching the API contract
- Logs all requests for audit

#### 2.2 Sync Engine (`lib/sync-engine.ts`)
Background sync that runs while the app is active:
- **Pull cycle**: refresh cached engagements, controls, evidence metadata on interval
- **Push cycle**: drain `sync_queue` table, push local findings/reports to SaaS
- **Conflict handling**: if SaaS returns a newer version, prompt assessor to resolve
- **Offline resilience**: queue writes locally when SaaS is unreachable, sync when reconnected
- **Status indicator**: expose sync state (synced / syncing / pending / offline) to the UI

#### 2.3 Cache Layer (`lib/cache.ts`)
- Read-through cache: check SQLite first, fetch from SaaS if stale/missing
- TTL-based expiry configurable via env
- Force-refresh option for manual "pull latest" action

---

### Phase 3: Copy & Adapt Views

#### 3.1 Copy C3PAO Pages
From `bedrock-cmmc/app/c3pao/` → `bedrock-c3pao/app/`:
- `login/page.tsx` → `app/login/page.tsx`
- `(dashboard)/**` → `app/(dashboard)/**`
- Remove `/c3pao` prefix from all internal `<Link>` and `router.push()` calls

#### 3.2 Copy C3PAO Components
From `bedrock-cmmc/components/c3pao/` → `bedrock-c3pao/components/c3pao/`
- All 23 components (listed in previous plan version)
- Add new `sync-status.tsx` component for the nav bar

#### 3.3 Copy Supporting Components
- `components/ui/` - shadcn/ui base components
- `components/shared/` - shared dependencies
- `components/evidence/` - evidence viewer
- `components/poam/` - POA&M viewer
- `components/stig/` - STIG viewer
- `components/assessment-mode-banner.tsx`

#### 3.4 Copy Library Files
- `lib/utils.ts`, `lib/utils/`, `lib/types/`, `lib/data/`, `lib/stig/`, `lib/cmmc/`
- `lib/pdf-generator.ts` (for local report generation)

#### 3.5 Rewrite Server Actions
The original server actions call Prisma directly. These must be rewritten to:
- **Reads**: query local SQLite cache → fallback to SaaS API fetch
- **Writes** (findings, reports): write to local SQLite → enqueue for sync
- **Auth**: validate against SaaS API, store session locally

| Original Action File         | New Action File        | Data Source Change                    |
|------------------------------|------------------------|---------------------------------------|
| `c3pao-auth.ts`             | `auth.ts`             | Prisma → SaaS API for login           |
| `c3pao-dashboard.ts`        | `engagements.ts`      | Prisma → SQLite cache + API fetch     |
| `c3pao-assessment.ts`       | `assessment.ts`       | Prisma → SQLite (local-first)         |
| `c3pao-conflict.ts`         | `assessment.ts`       | Merged into assessment actions         |
| `c3pao-team-assignment.ts`  | `team.ts`             | Prisma → SaaS API (read-only)         |
| `c3pao-workload.ts`         | `team.ts`             | Prisma → SaaS API (read-only)         |
| `cmmc-export.ts`            | `export.ts`           | Prisma → SQLite (local data)          |

---

### Phase 4: Middleware & Auth

#### 4.1 Simplified Middleware
```
/login          → public
/api/health     → public
everything else → requires valid local session
```

#### 4.2 Auth Flow
1. Assessor enters email + password on `/login`
2. Standalone sends credentials to SaaS via `POST /api/v1/instance/authenticate`
3. SaaS validates credentials, returns JWT + assessor profile + C3PAO org data
4. Standalone stores session in SQLite + sets `bedrock_c3pao_session` cookie (local JWT)
5. Subsequent requests validated locally via cookie (no SaaS round-trip per request)
6. Session expiry: 8 hours (matching existing C3PAO auth)

---

### Phase 5: Docker Deployment

#### 5.1 Dockerfile
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/db ./db

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

VOLUME ["/app/data"]

CMD ["node", "server.js"]
```

#### 5.2 docker-compose.yml
```yaml
services:
  c3pao:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SAAS_API_URL=${SAAS_API_URL}
      - INSTANCE_API_KEY=${INSTANCE_API_KEY}
      - AUTH_SECRET=${AUTH_SECRET}
      - NEXT_PUBLIC_APP_URL=${APP_URL:-http://localhost:3000}
    volumes:
      - c3pao_data:/app/data    # SQLite DB persists here
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  c3pao_data:
```

#### 5.3 .dockerignore
```
node_modules
.next
.git
*.md
.env*
.vscode
data/
```

---

### Phase 6: SaaS-Side Changes (bedrock-cmmc)

These API routes must be added to the existing SaaS platform to support standalone instances:

#### 6.1 New API Route Group: `/api/v1/instance/`
- Instance authentication middleware (validates `INSTANCE_API_KEY` header)
- All endpoints listed in the API Contract section above

#### 6.2 Instance Management (Admin)
- New admin page: `/admin/instances/` - list, register, revoke standalone instances
- Instance model in Prisma schema:
  ```prisma
  model StandaloneInstance {
    id              String   @id @default(cuid())
    c3paoId         String
    c3pao           C3PAOOrganization @relation(fields: [c3paoId], references: [id])
    name            String                // e.g., "ACME C3PAO - DC Office"
    apiKey          String   @unique      // hashed instance key
    lastHeartbeat   DateTime?
    lastSyncAt      DateTime?
    appVersion      String?
    status          InstanceStatus @default(ACTIVE)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }

  enum InstanceStatus {
    ACTIVE
    SUSPENDED
    REVOKED
  }
  ```

#### 6.3 C3PAO Dashboard Enhancement
- Add "Self-Hosted Instances" section to C3PAO org management
- Show instance health (last heartbeat, sync status, version)
- Button to register new instance + generate API key
- Button to revoke instance access

---

## Deployment Flow (End-to-End)

```
1. C3PAO signs up on Bedrock CMMC SaaS
2. C3PAO subscribes to self-hosted plan
3. C3PAO admin registers a new standalone instance in SaaS dashboard
4. SaaS generates instance API key → C3PAO admin copies it
5. C3PAO IT team deploys container in their VDI:

   $ cp .env.example .env
   $ vim .env                  # paste INSTANCE_API_KEY + SAAS_API_URL
   $ docker compose up -d

6. Assessors open browser → http://localhost:3000
7. Login with their C3PAO credentials (validated against SaaS)
8. Engagements sync from SaaS → local SQLite cache
9. Assessors perform assessments (saved locally, synced to SaaS)
10. Reports and eMASS exports generated locally
11. Findings sync back to SaaS automatically
```

---

## Excluded from Standalone

- Customer/OSC portal (stays on SaaS only)
- Admin portal (stays on SaaS only)
- Marketplace (stays on SaaS only)
- Direct database access (all data via API)
- Email sending (SaaS handles notifications)
- S3/MinIO storage (evidence streamed/proxied from SaaS)
- Subscription/billing (managed on SaaS)
- Prisma / PostgreSQL (replaced by SQLite + API)

---

## Summary

| Concern               | SaaS (bedrock-cmmc)                    | Standalone (bedrock-c3pao)            |
|------------------------|----------------------------------------|---------------------------------------|
| **Database**          | PostgreSQL (Neon)                       | SQLite (local cache + findings)       |
| **Auth source**       | Own user tables                         | Validates via SaaS API                |
| **Engagement data**   | Source of truth                          | Cached from SaaS                      |
| **Assessment work**   | Receives synced findings                | Local-first, syncs to SaaS            |
| **Evidence files**    | Stored in S3                            | Streamed/proxied from SaaS on demand  |
| **Reports/Exports**   | Receives synced copies                  | Generated locally                     |
| **Deployment**        | Vercel / AWS                            | Docker in customer VDI                |
| **Container count**   | N/A                                     | 1 (just the Next.js app)             |
| **Persistent storage**| Postgres + S3                           | Single SQLite file on Docker volume   |
