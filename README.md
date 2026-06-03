# Bedrock C3PAO — CMMC Assessment Portal

Standalone assessment tool for C3PAO assessors conducting CMMC Level 2 assessments. Deployed as a Docker container inside government-approved VDI environments.

Copyright (c) 2025 Foxx Cyber LLC. All rights reserved.

## Features

- CMMC Level 2 control assessment with per-objective findings
- STIG checklist (CKLB) import and mapping to CMMC objectives
- Evidence viewer with file proxy from Go API / S3
- POA&M management with SPRS scoring
- SSP read-only viewer
- Assessment report editor
- eMASS workbook export (Excel)
- Assessor team management and domain assignment
- Workload dashboard
- Offline-capable with local SQLite configuration
- Self-signed TLS with HTTPS proxy

## Quick Start

```bash
npm install
npm run dev
```

Open https://localhost:3001 (HTTPS, self-signed cert).

## Docker

The container needs a PostgreSQL database (local config, admin users, and
assessment data such as readiness checklists, notes, and outside-OSC
engagements). Use Compose, which starts Postgres alongside the app:

```bash
docker compose up -d --build
```

Then open https://localhost:3001 and complete the setup wizard.

For a pre-built image (e.g. a test VPS), use the deploy compose file:

```bash
cd deploy
cp .env.example .env        # set C3PAO_DB_PASSWORD
docker compose up -d
```

## Environment Variables

The only variable the container requires is `DATABASE_URL`, which Compose wires
in automatically. Everything else is created by the first-run setup wizard and
persisted to the `app_config` table:

```env
BEDROCK_API_URL=http://go-api:8080
INSTANCE_API_KEY=bri-xxxx
AUTH_SECRET=<random-base64>
C3PAO_ID=<uuid>
C3PAO_NAME=<org name>
FORCE_HTTPS=true
```

For a standalone container (no Compose), point `DATABASE_URL` at any reachable
Postgres — the schema bootstraps itself on first boot.

## Architecture

Most assessment data lives in the Go API backend (`bedrock-cmmc-api`); this app
is primarily a frontend/BFF client. A local PostgreSQL database stores instance
configuration, local admin users, and c3pao-local data (pre-assessment
readiness, internal notes/reviews, and self-contained outside-OSC engagements).

## Tech Stack

Next.js 16 | React 19 | TypeScript 5 | Tailwind CSS 4 | Shadcn/UI | PostgreSQL (pg) | Vitest

## License

Proprietary — Foxx Cyber LLC. All rights reserved.
