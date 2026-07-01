# ADR 0002 — C3PAO Offline Architecture: Self-Contained Next.js + TypeScript Data Layer

- **Status:** Accepted
- **Date:** 2026-06-30
- **Decider:** Jeremiah Price (Foxx Cyber LLC)
- **Relates to:** ADR 0001 (air-gapped CUI boundary), `docs/air-gap-scoping-brief.md`

## Context

Air-gapping `bedrock-c3pao` requires the assessment data to live locally with no live
Bedrock Go API. Today c3pao is a thin Next.js client of the shared Go API (~85
`lib/api-client.ts` functions). Three architectures were weighed for full offline parity:
(a) port the Go endpoints to a TypeScript data layer inside the Next.js app; (b) strip the
Go API to serve SSR HTML and drop Next.js; (c) bundle the existing Go API + Next.js as a
multi-process appliance.

## Decision

**Option (a): c3pao becomes a self-contained Next.js container with a TypeScript data layer.**

- The existing React UI is kept as-is; the work is **re-wiring the data layer** — server
  actions/route handlers call local TypeScript data functions (SQL against local PostgreSQL)
  instead of the remote Go API via `api-client.ts`.
- **No bundling** of the Go API. Better separation of concerns.
- The **Go API is parked** — cleaned up and retained for a future FedRAMP-certified **SaaS**
  version of the C3PAO app. It is not dual-maintained for the offline product.
- **Data tier:** PostgreSQL (local for air-gap; managed Azure DB for PostgreSQL for partner
  deployments like Number One Cyber).
- **Storage tier:** a pluggable evidence-storage abstraction (local filesystem for air-gap;
  S3 / Azure Blob for cloud). Mirrors the Go `pkg/s3` `Storage` interface pattern in TS.

## Rationale

- Reuses the **complete, already-built React assessment UI** (no UX regression).
- The `outside_osc` local engine (`lib/db-outside-*.ts`) already proves the local-Postgres
  data-layer pattern in TS — including status determination and eMASS export — so the port
  extends a working foundation rather than starting from scratch.
- Parking (not dual-maintaining) the Go API removes the duplication cost that (a) would
  otherwise carry.
- Single Next.js container is the leanest footprint in the C3PAO's environment when paired
  with managed Postgres + Blob (nothing extra for the partner to orchestrate).

## Consequences

**Deployment (partner, e.g. Number One Cyber):** App Service (the Next.js container) +
managed PostgreSQL + managed Blob/object storage. No bundled database or Go API.

**Work required (this spec):**
- Port all ~85 `api-client` functions to a local TypeScript data layer (mirror `outside_osc`).
- Local schema mirroring the OSC assessment data shapes; an **import** that loads an OSC
  export snapshot (JSON + evidence) into local Postgres + storage.
- Pluggable evidence-storage abstraction (local FS default).
- Offline assessor auth (extend the existing local `local_users` / `lib/local-auth.ts`).
- Sever the phone-home (heartbeat, `/api/instance/activate` setup gate, health/connection).
- Drop STIG / ISVI content (per ADR 0001).

**Risk:** the risk is **coverage, not complexity** — faithfully porting all 85 endpoints'
behavior. Mitigated by the mandated Feature Inventory (every function mapped to a task) and
tests per domain.

## Out of scope / deferred

- Results/return-path export back to the OSC — separate follow-up spec.
- The Go-side export producer — see the plan's scope note (the online platform emits the
  snapshot; the parked Go API is the natural home, coordinated separately).
