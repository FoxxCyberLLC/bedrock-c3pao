# Pre-Assessment Readiness Redesign

**Project:** `bedrock-c3pao`
**Date:** 2026-04-22
**Status:** Design approved, pending implementation plan

## Problem

The current Pre-Assessment Readiness checklist on the Planning tab has two flaws:

1. **Half the items are silently auto-derived by the Go API** (SSP Reviewed, Body of Evidence Confirmed, COI Cleared, Team Composed). Users see them flip to "complete" without performing any actual review or sign-off. This undermines the integrity of the checklist — an assessor cannot legitimately attest that they reviewed the SSP when the only trigger was "an SSP row exists in the API."
2. **No artifacts, no audit trail, no accountability.** Items that *are* manual are single-click toggles with no record of who did what, when, or why. There's no way to attach signed documents (contracts, COI attestations, drafted forms, eMASS confirmations) or to justify skipping an item.

Additionally:

- The "Advance to Phase 2" button fails with `invalid phase transition: cannot move from "" to "ASSESS" (not adjacent)` because the engagement's phase is never initialized to `PLAN`.
- The phase tracker at the top of the engagement detail page does not re-render to reflect phase changes.
- Tab information architecture mixes concerns: Team and Notes currently live under "Engagement" but belong under "Assessment" since they're assessment-phase activities.

## Goals

- Replace the mixed manual/derived checklist with a fully manual, artifact-backed workflow with lead-assessor sign-off and optional waivers.
- Keep all readiness data local to the C3PAO's PostgreSQL database and `c3pao-data` volume. The Go API is not a party to this record-keeping.
- Give every action in the readiness + notes system a non-repudiation audit trail.
- Restructure tabs so Team + Notes live under Assessment, and the Engagement tab is repurposed for OSC overview + Schedule & Logistics.
- Fix the phase tracker bug and replace "Advance to Phase 2" with a "Start Assessment" button that unlocks on checklist completion.
- Provide an export-audit-bundle feature for C3PAO record backup.

## Non-Goals

- Changes to the Go API (`bedrock-cmmc-api`). Artifacts, waivers, notes, and audit trail are entirely C3PAO-local.
- Syncing readiness artifacts to the OSC or other C3PAOs. This is internal C3PAO record-keeping.
- Migrating existing values from the old Go API `PreAssessChecklist`. The old derived state was unreliable; all engagements start fresh.
- Changes to the Package Data tab group (overview, system-profile, network, personnel, policies, assets, evidence, stigs, poams, full-ssp).

## Architecture

### Data storage

All new state lives in the C3PAO's local PostgreSQL database (accessed via `lib/db.ts`, `pg` driver, `DATABASE_URL`). Artifact blobs are stored as `bytea` columns — no filesystem storage. This means the database is the single backup unit for the C3PAO's assessment records.

Schema additions go through the existing `ensureSchema()` lazy-migration pattern in `lib/db.ts`.

### Tables

```sql
CREATE TABLE readiness_checklist_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id      TEXT NOT NULL,
  item_key           TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'not_started',
  completed_by       TEXT,
  completed_by_email TEXT,
  completed_at       TIMESTAMPTZ,
  waived_by          TEXT,
  waived_by_email    TEXT,
  waived_at          TIMESTAMPTZ,
  waiver_reason      TEXT,
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (engagement_id, item_key)
);

CREATE TABLE readiness_artifacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES readiness_checklist_items(id) ON DELETE CASCADE,
  filename          TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL,
  content           BYTEA NOT NULL,
  description       TEXT,
  uploaded_by       TEXT NOT NULL,
  uploaded_by_email TEXT NOT NULL,
  uploaded_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assessment_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id TEXT NOT NULL,
  author_id     TEXT NOT NULL,
  author_email  TEXT NOT NULL,
  author_name   TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE assessment_note_revisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id         UUID NOT NULL REFERENCES assessment_notes(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  edited_by       TEXT NOT NULL,
  edited_by_email TEXT NOT NULL,
  revised_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE readiness_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id TEXT NOT NULL,
  item_id       UUID,
  actor_id      TEXT NOT NULL,
  actor_email   TEXT NOT NULL,
  actor_name    TEXT NOT NULL,
  action        TEXT NOT NULL,
  details       JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_readiness_items_engagement ON readiness_checklist_items(engagement_id);
CREATE INDEX idx_readiness_audit_engagement ON readiness_audit_log(engagement_id, created_at DESC);
CREATE INDEX idx_assessment_notes_engagement ON assessment_notes(engagement_id, created_at DESC);
```

**Audit `action` values:** `item_completed`, `item_uncompleted`, `waiver_granted`, `waiver_revoked`, `artifact_uploaded`, `artifact_removed`, `note_created`, `note_edited`, `note_deleted`, `phase_advanced`.

**Engagement ID** is a `TEXT` reference to the Go API engagement ID — no foreign key, no local engagement table. Orphan cleanup is out of scope for this design.

### The 8 checklist items

Seeded lazily on first read of a given engagement (insert 8 rows with status `not_started` if none exist).

| item_key | Title | Default required artifact | Typical waiver reason |
|---|---|---|---|
| `contract_executed` | Contract Executed | Signed contract PDF | Verbal agreement, contract pending |
| `ssp_reviewed` | SSP Reviewed | SSP review memo / markup | Reviewed live in working session |
| `boe_confirmed` | Body of Evidence Confirmed | BoE inventory checklist | Reviewed in-system, no external doc needed |
| `coi_cleared` | Conflicts of Interest Cleared | Signed COI attestation per team member | Standing COI register already on file |
| `team_composed` | Assessment Team Composed | Team roster PDF or auto-generated | Team info in-system is sufficient |
| `form_drafted` | Pre-Assess Form Drafted | Draft form document | Form in shared drive, not uploaded yet |
| `form_qad` | Pre-Assess Form QA'd | QA review notes / redlined form | QA done verbally with reviewer |
| `emass_uploaded` | Uploaded to eMASS | eMASS confirmation (screenshot or reference #) | Upload pending |

Artifact upload is encouraged on every item but not enforced. The lead may mark an item complete without artifacts, in which case the lack of artifact is itself recorded in the audit log (the completion event captures the current artifact count in `details`).

### Item state machine

```
not_started ──[upload artifact]──> in_progress ──[complete (lead)]──> complete
     │                                     │                              │
     │                                     └──[complete (lead)]───────────┘
     │
     └──[grant waiver (lead)]──> waived ──[revoke waiver (lead)]──> not_started
                                   │                                     │
                                   └───[complete (lead)]─────────────────┘
```

- "In progress" is implicit — not a stored value, derived from "has artifacts but not complete/waived."
- A waived item counts toward "ready to start" just like a completed item.
- Re-opening a completed item sets status back to `in_progress` if artifacts exist, `not_started` otherwise.

### Server Actions

New file: `app/actions/c3pao-readiness.ts`.

```ts
getReadinessChecklist(engagementId): Result<ReadinessChecklist>
getReadinessAuditLog(engagementId): Result<AuditEntry[]>

completeItem(engagementId, itemKey): Result<void>        // lead only
uncompleteItem(engagementId, itemKey): Result<void>      // lead only
grantWaiver(engagementId, itemKey, reason): Result<void> // lead only
revokeWaiver(engagementId, itemKey): Result<void>        // lead only

uploadArtifact(engagementId, itemKey, FormData): Result<{ id: string }>  // 50MB max
removeArtifact(engagementId, itemKey, artifactId): Result<void>

startAssessment(engagementId): Result<void>              // lead only, validates 8/8

listNotes(engagementId): Result<Note[]>
createNote(engagementId, body): Result<{ id: string }>
editNote(noteId, body): Result<void>                     // author only
deleteNote(noteId): Result<void>                         // author only, soft
```

API routes (for binary streams that Server Actions cannot return cleanly):

- `GET /api/c3pao/readiness/artifact/[id]` — downloads artifact blob
- `GET /api/c3pao/engagements/[id]/export-bundle` — streams audit-bundle zip (lead only)

All actions follow the existing return envelope: `{ success: boolean; data?: T; error?: string }`. All actions call `requireAuth()` (existing) and, for lead-restricted actions, a new `requireLeadAssessor(engagementId)` helper added to `lib/auth.ts`. That helper fetches team membership via the existing Go API endpoint and returns `{ session, isLead }` or errors. UI hides disallowed controls, but the server enforces authoritatively.

## UI

### Tab restructure (`components/c3pao/engagement-detail.tsx`)

| Group | Tabs | Change from today |
|---|---|---|
| Package Data | overview, system-profile, network, personnel, policies, assets, evidence, stigs, poams, full-ssp | None |
| Assessment | Planning, Controls, Progress, Review | Planning gains Readiness workspace + Team card. Review gains Notes. |
| Engagement | Overview, Schedule & Logistics | Old `team`, `notes`, `details` tabs removed. |

### Assessment → Planning

Two stacked sections:

1. **Pre-Assessment Readiness** (new, top)
2. **Team** (relocated from old Engagement tab — renders existing `EngagementTeamCard`)
3. **Assessment Planning Board** (existing `assessment-planning-board.tsx` — unchanged)

### Readiness Workspace (the main UI surface)

Two-column layout:

- **Left column — item list.** Eight rows, each with status icon (`○` not started, `◐` in progress, `◑` waived, `●` complete), item title, and a one-line status summary. Selected row is highlighted. Progress bar at top: "N/8 complete".
- **Right column — detail pane for the selected item:**
  - **Artifacts section:** drag-drop upload zone (hidden if status=waived), list of uploaded files with filename / size / uploader / timestamp / download / delete controls. Server Actions body limit of 50 MB enforced with pre-upload client validation and server re-check.
  - **Completion / Waiver section:** state-dependent controls.
    - Lead + not complete: `[Mark Complete]` button, `[Waive this item]` link.
    - Lead + complete: "Marked complete by X at Y" + `[Re-open]`.
    - Lead + waived: "Waived by X — reason: …" + `[Revoke waiver]`.
    - Non-lead: read-only state, no action buttons.
  - **Activity section:** chronological feed from `readiness_audit_log` filtered to this item.

Waiver dialog is a modal with a required "Reason for waiver" textarea (minimum 20 characters, enforced client- and server-side).

Bottom bar below the two columns:

- **Start Assessment** button — disabled with helper text until all 8 items are `complete` or `waived`. On click: `startAssessment()` → validates server-side → calls Go API phase transition to `ASSESS` → refreshes page. Replaces the current "Advance to Phase 2" button entirely.

### Assessment → Review (Notes section)

Engagement-scoped notes panel below whatever exists on the Review tab today:

- `[+ Add Note]` button opens a textarea dialog.
- Notes listed newest-first.
- Each card: author name (with "lead assessor" badge if applicable), timestamp, body.
- `[Edit]` / `[Delete]` buttons appear only to the author.
- After first edit: "Edited N times · [View history]" link shows. History dialog lists revisions (body + editor + timestamp) in chronological order. Revisions are immutable.
- Delete = soft delete (note hidden, revisions preserved in DB).
- Every create/edit/delete logs to `readiness_audit_log`.

### Engagement → Overview (new)

OSC summary card:

- OSC name, primary POCs, contract start / end dates
- Current assessment phase (reflecting the live tracker)
- Compliance package type (CMMC L2, target)
- Compliance certificate expiry if applicable

Engagement metadata card:

- Contract reference, engagement owner, key dates
- **Export audit bundle** button (lead only) → triggers `/api/c3pao/engagements/[id]/export-bundle`

Fields sourced from `GET /api/c3pao/assessments/:id` (existing API). No new data model needed for this tab.

### Engagement → Schedule & Logistics (new)

Simple form-driven view for this first pass:

- Kickoff date
- On-site assessment window (start / end)
- Interview schedule — free-form textarea for v1 (may become structured list later)
- Deliverable due dates
- CAP Phase 1 / 2 / 3 target dates
- Location / access notes

Data lives in a new table `engagement_schedule` keyed by `engagement_id` (single row per engagement, nullable columns). Can evolve into structured items later; keep simple now.

### Phase tracker (top of engagement detail)

- Investigate why the phase tracker component doesn't re-render on phase change (likely stale prop / missing revalidation after `startAssessment`).
- Fix: on `startAssessment` success, call `revalidatePath()` for the engagement detail route so the page re-fetches and the tracker reflects `ASSESS`.
- Visual: active phase highlighted, completed phases checkmarked, future phases muted. Component implementation detail to be pinned down in implementation plan after inspection.

### Phase initialization (fixes the `""` → `ASSESS` bug)

Root cause: engagements are not initialized to phase `PLAN`, so the first transition attempt fails because `""` and `ASSESS` aren't adjacent.

Fix:

1. On readiness workspace load, if the current engagement's phase is empty/null, call a lightweight server action that tells the Go API to set phase to `PLAN`. This is idempotent.
2. File an issue for the Go API team to default new engagements to `PLAN` on creation (out of scope for this spec but noted).

## Permissions

| Action | Any team member | Lead assessor |
|---|---|---|
| View checklist, artifacts, notes, audit log, export button state | ✅ | ✅ |
| Upload artifact | ✅ | ✅ |
| Remove artifact they uploaded | ✅ | ✅ |
| Remove any artifact | ❌ | ✅ |
| Mark item complete / re-open | ❌ | ✅ |
| Grant / revoke waiver | ❌ | ✅ |
| Create note | ✅ | ✅ |
| Edit / delete own note | ✅ | ✅ |
| Edit / delete another user's note | ❌ | ❌ |
| Start Assessment | ❌ | ✅ |
| Export audit bundle | ❌ | ✅ |

Enforced via `requireAuth()` + a new `requireLeadAssessor(engagementId)` helper that checks the current team membership via the Go API. UI hides disallowed controls but the server is the source of truth for authorization.

## Export Audit Bundle

`GET /api/c3pao/engagements/[id]/export-bundle` (lead only) streams a `.zip` with:

- `manifest.json` — engagement id, generated-at timestamp, bundle schema version
- `readiness/checklist.json` — items with full state
- `readiness/audit-log.json` — full `readiness_audit_log` rows for the engagement
- `readiness/artifacts/<id>__<filename>` — each artifact, prefixed with its id to avoid collisions
- `notes/notes.json` — notes + revisions

Implemented with a streaming zip library (e.g., `archiver` or the existing dependency set — to be selected during implementation). Artifacts are streamed directly from Postgres `bytea` to the zip stream.

## Migration from current system

- Delete `app/actions/c3pao-preassess.ts`.
- Delete `components/c3pao/engagement/pre-assessment-workspace.tsx`.
- Remove references to `fetchPreAssess` / `updatePreAssess` from `lib/api-client.ts`. (The Go API endpoint stays — its deprecation is a separate Go-side decision.)
- Remove the old `team`, `notes`, `details` tabs and their content from `engagement-detail.tsx`.
- Re-render `EngagementTeamCard` inside the new Planning tab layout.
- No data migration. Engagements start fresh: first read seeds 8 `readiness_checklist_items` rows at status `not_started`.
- Document the change in the project CHANGELOG.

## Testing

- **Unit (Vitest):** server actions — happy path + permission-denial path for each. Waiver grant/revoke. Note revision creation on edit. Checklist progress calculation (`N/8`, `canStart`).
- **Component (Vitest + React Testing Library):** readiness workspace list/detail selection, author-only controls on notes, waiver modal validation, upload size-cap validation, disabled Start Assessment button with helper text.
- **Integration (Vitest + test Postgres):** full flow — seed items on first read, upload artifacts, mark items complete, waive an item, revoke waiver, re-open completed item, trigger Start Assessment with a mocked Go API client, verify audit log rows.
- **E2E (`playwright-cli` with `-s="${CLAUDE_SESSION_ID:-default}"`):** lead logs in → navigates to Planning → uploads an artifact → marks an item complete → grants a waiver → Start Assessment unlocks on 8/8 → clicks → phase tracker advances to `ASSESS`. Second session: non-lead user sees read-only state.
- **Coverage target:** ≥80% on new files in `app/actions/c3pao-readiness.ts`, `lib/db.ts` additions, and new components.

## Risks

- **Blob storage in Postgres can bloat the database.** Keep per-artifact size at 50 MB (matches existing Server Action limit). Monitor database size growth post-launch; consider moving to object storage later if artifacts exceed a reasonable threshold (e.g., >10 GB per engagement).
- **Phase tracker fix depends on understanding the existing component.** If the tracker re-render bug traces to a deeper state-management problem, it may require more work than scoped here. Budget time to investigate during implementation.
- **Lead assessor identity check** relies on the Go API team assignment endpoint. If that endpoint is unavailable or slow, permission checks could fail. Fall back to denying the action with a clear error rather than bypassing.
- **Waiver abuse.** Nothing prevents a lead from waiving every item. Acceptable for now (lead accountability is the control); can layer reporting/alerts later if desired.

## Deferred / out of scope

- Changes to the Go API
- Per-item comments (engagement-level notes cover this for now)
- Real-time collaboration on notes (plain list + refresh is fine)
- Rich-text notes (plain text only; can add later)
- Role management beyond "lead vs. team member"
- Automated export scheduling (manual button only)
- Structured schedule data model (free-form text fields are enough for v1)

## Open questions to confirm during implementation

- Exact ID format for assessors used in `completed_by` / `author_id` — must match what the Go API team endpoint returns.
- Which zip library to use for export streaming — pick based on existing dependency tree (prefer whatever PDF / eMASS exports already use, or add `archiver`).
- Whether "Start Assessment" should also advance a second internal state (e.g., mark the readiness workspace read-only) — assume yes; clarify in implementation.
