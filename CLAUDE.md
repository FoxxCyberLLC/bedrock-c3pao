# Bedrock C3PAO — Assessor Container

## What This Is

The C3PAO (Certified Third-Party Assessment Organization) assessment portal for CMMC Level 2 assessments. Runs as a standalone Docker container inside a government-approved VDI. Assessors use this to conduct on-site CMMC assessments against contractor organizations.

## Architecture

```
Browser → HTTPS (port 3001, self-signed TLS via start.js)
       → Node HTTPS proxy → Next.js HTTP (port 3000, internal)
       → Server Actions / API Routes → Go API (BEDROCK_API_URL)
```

- **No direct DB access for shared assessment data** — the Go API (`bedrock-cmmc-api`) is the source of truth for engagement, SSP, asset, evidence, POAM, and team data
- **Offline-capable** — designed to work in disconnected environments
- Next.js `output: 'standalone'` for containerized deployment, started via `start.js` (HTTPS proxy)

## Data Model

- **Go API** (`bedrock-cmmc-api`) is the source of truth for engagement, SSP, asset, evidence, POAM, and team data. Accessed via `lib/api-client.ts`. Never queried directly from the frontend.
- **Local Postgres** (accessed via `lib/db.ts` / `pg` driver, configured by `DATABASE_URL`) is the only local store. It holds: instance configuration (`app_config`), local admin users (`local_users`), and C3PAO-local assessment records — pre-assessment readiness checklist + artifacts (bytea blobs), living notes + revisions, audit log, engagement schedule, and outside-OSC engagements. None of this data is shared with the OSC or other C3PAOs. (There is **no** SQLite/`better-sqlite3` — older docs claiming `data/config.db` are stale.)

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5
- **UI**: Shadcn/UI + Radix primitives, Tailwind CSS 4, Lucide icons, Sonner toasts, Recharts
- **Forms**: React Hook Form + Zod
- **Local DB**: PostgreSQL via `pg`
- **Auth/JWT**: jose (HS256)
- **PDF**: @react-pdf/renderer
- **Excel**: exceljs (eMASS workbook export)
- **Config encryption**: AES-256-GCM (`lib/crypto.ts`), key from `CONFIG_ENCRYPTION_KEY`
- **Testing**: Vitest

## Running

```bash
npm install
npm run dev           # Next.js dev server
npm run build         # Production build
npm run test          # vitest run
npm run test:watch    # vitest watch
npm run lint          # eslint
```

## Container

```bash
docker build -t bedrock-c3pao .
docker run -p 3001:3001 -v c3pao-data:/app/data bedrock-c3pao
```

Port 3001 (HTTPS). The `data/` volume persists the self-signed TLS certs (`data/certs/`). Instance config lives in Postgres (`app_config`), not in the volume; the AES-256-GCM config key comes from the `CONFIG_ENCRYPTION_KEY` env var and is never written to the volume.

## Two-Tier Authentication

1. **Local Admin** — stored in the Postgres `local_users` table, scrypt hashed. Can only access `/admin`. Created during setup wizard.
2. **C3PAO Assessor** — authenticates against Go API (`/api/auth/login`). JWT stored in session. Can access assessment routes.

Session cookie: `bedrock_c3pao_session` (HS256 JWT, 8h expiry, httpOnly).

## Instance Configuration

Two modes:
- **Environment variables** (production): `BEDROCK_API_URL`, `INSTANCE_API_KEY` (starts with `bri-`), `AUTH_SECRET`, `C3PAO_ID`, `C3PAO_NAME`
- **Setup wizard** (first-run): config stored in the Postgres `app_config` table. Sensitive values (`AUTH_SECRET`, `INSTANCE_API_KEY`) are AES-256-GCM encrypted at rest via `lib/crypto.ts`; the key comes from the `CONFIG_ENCRYPTION_KEY` env var (32-byte hex/base64, never stored in the data volume).

`start.js` loads config from Postgres — decrypting sensitive values with an inline `node:crypto` decrypt that shares the `enc:v1:` wire format with `lib/crypto.ts` — generates a self-signed TLS cert if needed, and starts the HTTPS proxy. The Fargate path (`server.js`) does the same load+decrypt in `instrumentation.ts`.

**Required env vars:** `CONFIG_ENCRYPTION_KEY` (config encryption key) and, when `DATABASE_URL` carries `sslmode=`, `DATABASE_CA_CERT` (PEM CA used to verify the Postgres TLS connection — connections fail closed without it).

## Key Directories

```
app/(dashboard)/              # Authenticated assessor area
  engagements/[id]/           # Assessment workspace (controls, STIGs, evidence, POAMs, SSP, report, eMASS export)
  connection/                 # API connectivity status
  team/                       # Assessor team management
  workload/                   # Workload dashboard
app/setup/                    # First-run setup wizard
app/admin/                    # Local admin panel
app/actions/                  # Server Actions (all data mutations)
app/api/                      # API routes (health, evidence proxy, eMASS export)
lib/api-client.ts             # Typed Go API client (all data fetching)
lib/auth.ts                   # Session management (Node.js)
lib/auth-edge.ts              # JWT-only Edge runtime (middleware)
lib/db.ts                     # PostgreSQL pool + schema init (pg)
lib/config.ts                 # Postgres app_config store (getConfig/setConfig, encrypts sensitive keys)
lib/crypto.ts                 # AES-256-GCM encryption for sensitive app_config values
lib/local-auth.ts             # Local admin auth (scrypt)
lib/instance-config.ts        # Instance configuration helpers
lib/heartbeat.ts              # Fire-and-forget POST to Go API
lib/emass-workbook.ts         # eMASS Excel workbook builder (exceljs)
lib/cmmc/requirement-values.ts   # All 110 CMMC L2 requirements with SPRS point values
lib/cmmc/status-determination.ts # CAP v2.0 Phase 3 outcome logic
lib/stig/types.ts             # STIG view types (STIG data comes from the Go API; no local CKLB parser)
lib/pdf-templates/            # @react-pdf/renderer templates (certificate, SSP)
```

## Data Pattern

All server actions follow:
```typescript
'use server'
async function action(): Promise<{ success: boolean; data?: T; error?: string }> {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }
  // Call lib/api-client function with session.apiToken
}
```

## Key Constraints

- **Server Actions body limit**: 50MB (file uploads, PDF exports)
- **Evidence proxy limit**: 25MB (streamed, never buffered)
- **Instance API key format**: must start with `bri-`
- `components/ui/chart.tsx` and `components/ui/resizable.tsx` (vendored shadcn/UI) carry `@ts-nocheck`
- `lib/prisma-types.ts` — stub types replacing Prisma-generated types (no actual Prisma dependency)

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /gstack-qa, /gstack-ship, /gstack-review,
/gstack-investigate, and /gstack-browse are available. Use /gstack-browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

Key routing rules:
- Container errors, PostgreSQL failures, dual-auth issues, offline mode bugs → invoke investigate
- Instance config, encryption key, API connectivity problems → invoke investigate
- QA the assessor container, test the assessment workflow, test STIG import → invoke qa
- Security audit, encryption review, instance key management, auth flows → invoke cso
- Architecture, dual-auth design, offline-first patterns → invoke plan-eng-review
- Visual design, assessment UI polish → invoke design-review
- Diff check, pre-PR review → invoke review
- Ship, build container image, create PR → invoke ship
- CMMC assessment workflow design, new feature brainstorm → invoke office-hours
- Weekly retro → invoke retro
