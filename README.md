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

```bash
docker build -t bedrock-c3pao .
docker run -p 3001:3001 -v c3pao-data:/app/data bedrock-c3pao
```

## Environment Variables

```env
BEDROCK_API_URL=http://go-api:8080
INSTANCE_API_KEY=bri-xxxx
AUTH_SECRET=<random-base64>
C3PAO_ID=<uuid>
C3PAO_NAME=<org name>
FORCE_HTTPS=true
```

Or configure via the setup wizard on first run (stored encrypted in SQLite).

## Architecture

All assessment data lives in the Go API backend (`bedrock-cmmc-api`). This app is a pure frontend/BFF client. Local SQLite stores only instance configuration and local admin users.

## Tech Stack

Next.js 16 | React 19 | TypeScript 5 | Tailwind CSS 4 | Shadcn/UI | better-sqlite3 | Vitest

## License

Proprietary — Foxx Cyber LLC. All rights reserved.
