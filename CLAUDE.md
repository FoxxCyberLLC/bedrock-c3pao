# Bedrock C3PAO — Assessor Container

## What This Is

The C3PAO (Certified Third-Party Assessment Organization) assessment portal for CMMC Level 2 assessments. Runs as a standalone Docker container inside a government-approved VDI. Assessors use this to conduct on-site CMMC assessments against contractor organizations.

## Architecture

```
Browser → HTTPS (port 3001, self-signed TLS via start.js)
       → Node HTTPS proxy → Next.js HTTP (port 3000, internal)
       → Server Actions / API Routes → Go API (BEDROCK_API_URL)
```

- **No direct DB access for assessment data** — the Go API (`bedrock-cmmc-api`) is the sole source of truth
- **Local SQLite** (`data/config.db`) stores only instance configuration and local admin users
- **Offline-capable** — designed to work in disconnected environments
- Next.js `output: 'standalone'` for containerized deployment
- `better-sqlite3` is a native module excluded from bundling via `serverExternalPackages`

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5
- **UI**: Shadcn/UI + Radix primitives, Tailwind CSS 4, Lucide icons, Sonner toasts, Recharts
- **Forms**: React Hook Form + Zod
- **Local DB**: better-sqlite3 (WAL mode)
- **Auth/JWT**: jose (HS256)
- **PDF**: @react-pdf/renderer
- **Excel**: xlsx (eMASS workbook export)
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

Port 3001 (HTTPS). The `data/` volume persists config.db, encryption keys, and TLS certs.

## Two-Tier Authentication

1. **Local Admin** — stored in SQLite `local_users` table, scrypt hashed. Can only access `/admin`. Created during setup wizard.
2. **C3PAO Assessor** — authenticates against Go API (`/api/auth/login`). JWT stored in session. Can access assessment routes.

Session cookie: `bedrock_c3pao_session` (HS256 JWT, 8h expiry, httpOnly).

## Instance Configuration

Two modes:
- **Environment variables** (production): `BEDROCK_API_URL`, `INSTANCE_API_KEY` (starts with `bri-`), `AUTH_SECRET`, `C3PAO_ID`, `C3PAO_NAME`
- **Setup wizard** (first-run): config stored encrypted in SQLite (AES-256-GCM, key at `data/.encryption-key`)

`start.js` loads config from SQLite, generates self-signed TLS cert if needed, starts HTTPS proxy.

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
lib/db.ts                     # SQLite connection singleton
lib/config.ts                 # SQLite config store (getConfig/setConfig)
lib/crypto.ts                 # AES-256-GCM encryption for SQLite values
lib/local-auth.ts             # Local admin auth (scrypt)
lib/instance-config.ts        # Instance configuration helpers
lib/heartbeat.ts              # Fire-and-forget POST to Go API
lib/emass-workbook.ts         # eMASS Excel workbook builder
lib/cmmc/requirement-values.ts   # All 110 CMMC L2 requirements with SPRS point values
lib/cmmc/status-determination.ts # CAP v2.0 Phase 3 outcome logic
lib/stig/parser.ts            # CKLB file parser
lib/stig/cci-to-cmmc.ts       # CCI → NIST 800-53 → 800-171 → CMMC mapping
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
- `lib/pdf-generator.ts` and `lib/stig/cci-to-cmmc.ts` have `@ts-nocheck` — legacy Prisma refs, not used in production flow
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
- Container errors, SQLite failures, dual-auth issues, offline mode bugs → invoke investigate
- Instance config, encryption key, API connectivity problems → invoke investigate
- QA the assessor container, test the assessment workflow, test STIG import → invoke qa
- Security audit, encryption review, instance key management, auth flows → invoke cso
- Architecture, dual-auth design, offline-first patterns → invoke plan-eng-review
- Visual design, assessment UI polish → invoke design-review
- Diff check, pre-PR review → invoke review
- Ship, build container image, create PR → invoke ship
- CMMC assessment workflow design, new feature brainstorm → invoke office-hours
- Weekly retro → invoke retro
