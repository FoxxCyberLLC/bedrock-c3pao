# Pre-Assessment Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed manual/derived pre-assessment readiness checklist with a fully manual, artifact-backed workflow with lead-assessor sign-off, waivers, living notes, and audit trail — all stored locally in the C3PAO's PostgreSQL; restructure tabs; fix the phase tracker.

**Architecture:** New local-only data model (Postgres tables + `bytea` blobs) accessed via thin `lib/db-*.ts` helpers; server actions in `app/actions/c3pao-readiness.ts`, `c3pao-notes.ts`, `c3pao-schedule.ts`; binary endpoints via API routes; shadcn/ui + tailwind for the two-column workspace, notes panel, and new Engagement subtabs; Go API touched only for the `PLAN → ASSESS` phase transition.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript 5 · `pg` (PostgreSQL) · Vitest · shadcn/ui + Radix · Tailwind 4 · React Hook Form + Zod · `archiver` (zip streaming, to be added)

**Spec:** `docs/superpowers/specs/2026-04-22-pre-assessment-readiness-design.md`

**Worktree (recommended):** `git worktree add .worktrees/pre-assessment-readiness -b feature/pre-assessment-readiness` — run all tasks inside the worktree.

**Package manager:** npm (lockfile: `package-lock.json`).

**Test command:** `npm run test -- --silent` (Vitest). Run a single file with `npm run test -- path/to/file.test.ts`.

---

## Task 1: Add pgcrypto extension + readiness schema to `ensureSchema()`

**Files:**
- Modify: `lib/db.ts` (extend `ensureSchema()` with new tables)
- Test: `lib/db.test.ts` (create if missing)

- [ ] **Step 1: Write the failing test**

Create or extend `lib/db.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { ensureSchema, query } from './db'

describe('ensureSchema – readiness tables', () => {
  beforeAll(async () => {
    await ensureSchema()
  })

  it('creates readiness_checklist_items', async () => {
    const r = await query(
      `SELECT to_regclass('public.readiness_checklist_items') AS t`,
    )
    expect(r.rows[0].t).toBe('readiness_checklist_items')
  })

  it('creates readiness_artifacts with bytea content column', async () => {
    const r = await query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name='readiness_artifacts' AND column_name='content'`,
    )
    expect(r.rows[0]?.data_type).toBe('bytea')
  })

  it('creates assessment_notes, note_revisions, audit log', async () => {
    for (const t of ['assessment_notes', 'assessment_note_revisions', 'readiness_audit_log']) {
      const r = await query(`SELECT to_regclass($1) AS t`, [`public.${t}`])
      expect(r.rows[0].t).toBe(t)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --silent lib/db.test.ts
```

Expected: FAIL — tables do not exist.

- [ ] **Step 3: Extend `ensureSchema()` in `lib/db.ts`**

Find the existing `ensureSchema` body (after `CREATE TABLE IF NOT EXISTS local_users`) and append these statements inside the same `await pool.query(...)` call — or chain additional `pool.query` awaits. Exact addition:

```ts
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS readiness_checklist_items (
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

      CREATE TABLE IF NOT EXISTS readiness_artifacts (
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

      CREATE TABLE IF NOT EXISTS assessment_notes (
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

      CREATE TABLE IF NOT EXISTS assessment_note_revisions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id         UUID NOT NULL REFERENCES assessment_notes(id) ON DELETE CASCADE,
        body            TEXT NOT NULL,
        edited_by       TEXT NOT NULL,
        edited_by_email TEXT NOT NULL,
        revised_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS readiness_audit_log (
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

      CREATE TABLE IF NOT EXISTS engagement_schedule (
        engagement_id         TEXT PRIMARY KEY,
        kickoff_date          DATE,
        onsite_start          DATE,
        onsite_end            DATE,
        interview_schedule    TEXT,
        deliverable_due_dates TEXT,
        phase_1_target        DATE,
        phase_2_target        DATE,
        phase_3_target        DATE,
        location_notes        TEXT,
        updated_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_by            TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_readiness_items_engagement
        ON readiness_checklist_items(engagement_id);
      CREATE INDEX IF NOT EXISTS idx_readiness_audit_engagement
        ON readiness_audit_log(engagement_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_assessment_notes_engagement
        ON assessment_notes(engagement_id, created_at DESC);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --silent lib/db.test.ts
```

Expected: PASS on all three `it` blocks.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/db.test.ts
git commit -m "feat(db): add readiness schema (items, artifacts, notes, audit, schedule)"
```

---

## Task 2: Shared types + readiness item constants

**Files:**
- Create: `lib/readiness-types.ts`
- Create: `lib/readiness-items.ts`
- Test: `lib/readiness-items.test.ts`

**Responsibility:** pure, dependency-free modules other layers import. No DB, no network.

### `lib/readiness-types.ts`

```ts
export const READINESS_ITEM_KEYS = [
  'contract_executed',
  'ssp_reviewed',
  'boe_confirmed',
  'coi_cleared',
  'team_composed',
  'form_drafted',
  'form_qad',
  'emass_uploaded',
] as const
export type ReadinessItemKey = (typeof READINESS_ITEM_KEYS)[number]

export type ReadinessItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'waived'
  | 'complete'

export interface ReadinessArtifact {
  id: string
  itemId: string
  filename: string
  mimeType: string
  sizeBytes: number
  description: string | null
  uploadedBy: string
  uploadedByEmail: string
  uploadedAt: string
}

export interface ReadinessItem {
  id: string
  engagementId: string
  itemKey: ReadinessItemKey
  status: ReadinessItemStatus
  completedBy: string | null
  completedByEmail: string | null
  completedAt: string | null
  waivedBy: string | null
  waivedByEmail: string | null
  waivedAt: string | null
  waiverReason: string | null
  updatedAt: string
  artifacts: ReadinessArtifact[]
}

export interface ReadinessChecklist {
  engagementId: string
  items: ReadinessItem[]
  completedCount: number // complete OR waived
  totalCount: 8
  canStart: boolean      // completedCount === 8
}

export type AuditAction =
  | 'item_completed'
  | 'item_uncompleted'
  | 'waiver_granted'
  | 'waiver_revoked'
  | 'artifact_uploaded'
  | 'artifact_removed'
  | 'note_created'
  | 'note_edited'
  | 'note_deleted'
  | 'phase_advanced'

export interface AuditEntry {
  id: string
  engagementId: string
  itemId: string | null
  actorId: string
  actorEmail: string
  actorName: string
  action: AuditAction
  details: Record<string, unknown> | null
  createdAt: string
}

export interface AssessmentNote {
  id: string
  engagementId: string
  authorId: string
  authorEmail: string
  authorName: string
  body: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  revisionCount: number
}

export interface NoteRevision {
  id: string
  noteId: string
  body: string
  editedBy: string
  editedByEmail: string
  revisedAt: string
}
```

### `lib/readiness-items.ts`

```ts
import type { ReadinessItemKey } from './readiness-types'
import { READINESS_ITEM_KEYS } from './readiness-types'

export interface ReadinessItemDefinition {
  key: ReadinessItemKey
  title: string
  defaultArtifactDescription: string
  typicalWaiverReason: string
  order: number
}

export const READINESS_ITEM_DEFINITIONS: Record<ReadinessItemKey, ReadinessItemDefinition> = {
  contract_executed: {
    key: 'contract_executed',
    title: 'Contract Executed',
    defaultArtifactDescription: 'Signed contract PDF',
    typicalWaiverReason: 'Verbal agreement, contract pending',
    order: 1,
  },
  ssp_reviewed: {
    key: 'ssp_reviewed',
    title: 'SSP Reviewed',
    defaultArtifactDescription: 'SSP review memo or markup',
    typicalWaiverReason: 'Reviewed live in working session',
    order: 2,
  },
  boe_confirmed: {
    key: 'boe_confirmed',
    title: 'Body of Evidence Confirmed',
    defaultArtifactDescription: 'BoE inventory checklist',
    typicalWaiverReason: 'Reviewed in-system, no external doc needed',
    order: 3,
  },
  coi_cleared: {
    key: 'coi_cleared',
    title: 'Conflicts of Interest Cleared',
    defaultArtifactDescription: 'Signed COI attestation per team member',
    typicalWaiverReason: 'Standing COI register already on file',
    order: 4,
  },
  team_composed: {
    key: 'team_composed',
    title: 'Assessment Team Composed',
    defaultArtifactDescription: 'Team roster PDF',
    typicalWaiverReason: 'Team info in-system is sufficient',
    order: 5,
  },
  form_drafted: {
    key: 'form_drafted',
    title: 'Pre-Assess Form Drafted',
    defaultArtifactDescription: 'Draft form document',
    typicalWaiverReason: 'Form in shared drive, not uploaded yet',
    order: 6,
  },
  form_qad: {
    key: 'form_qad',
    title: "Pre-Assess Form QA'd",
    defaultArtifactDescription: 'QA review notes or redlined form',
    typicalWaiverReason: 'QA done verbally with reviewer',
    order: 7,
  },
  emass_uploaded: {
    key: 'emass_uploaded',
    title: 'Uploaded to eMASS',
    defaultArtifactDescription: 'eMASS confirmation (screenshot or ref #)',
    typicalWaiverReason: 'Upload pending',
    order: 8,
  },
}

export function orderedItemDefinitions(): ReadinessItemDefinition[] {
  return READINESS_ITEM_KEYS.map((k) => READINESS_ITEM_DEFINITIONS[k])
}
```

### Test

```ts
import { describe, it, expect } from 'vitest'
import { orderedItemDefinitions, READINESS_ITEM_DEFINITIONS } from './readiness-items'
import { READINESS_ITEM_KEYS } from './readiness-types'

describe('readiness-items', () => {
  it('has exactly 8 items', () => {
    expect(orderedItemDefinitions()).toHaveLength(8)
  })
  it('every key in READINESS_ITEM_KEYS has a definition', () => {
    for (const k of READINESS_ITEM_KEYS) {
      expect(READINESS_ITEM_DEFINITIONS[k]).toBeDefined()
      expect(READINESS_ITEM_DEFINITIONS[k].title).toBeTruthy()
    }
  })
  it('orders are unique and sequential 1-8', () => {
    const orders = orderedItemDefinitions().map((d) => d.order)
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
```

- [ ] **Steps 1-5:** Write the three files with the content above, run `npm run test -- --silent lib/readiness-items.test.ts` (expect PASS), commit:

```bash
git add lib/readiness-types.ts lib/readiness-items.ts lib/readiness-items.test.ts
git commit -m "feat(readiness): add shared types and item definitions"
```

---

## Task 3: `requireLeadAssessor()` auth helper

**Files:**
- Modify: `lib/auth.ts` (append helper)
- Test: `lib/auth.test.ts` (create)

**Responsibility:** Return `{ session, isLead, error }`. Use the `isLeadAssessor` flag on `SessionC3PAOUser`. For engagement-scoped checks, also call `fetchTeam(engagementId)` from `lib/api-client.ts` and verify the caller is listed with role `LEAD_ASSESSOR`. If either global flag OR engagement role qualifies, `isLead = true`.

```ts
/** Require an authenticated lead assessor for a specific engagement. */
export async function requireLeadAssessor(engagementId: string): Promise<{
  session: C3PAOSessionPayload | null
  isLead: boolean
  error?: string
}> {
  const session = await requireAuth()
  if (!session) return { session: null, isLead: false, error: 'Unauthorized' }

  // Fast path: session flag set at login
  if (session.c3paoUser.isLeadAssessor) return { session, isLead: true }

  // Slow path: engagement team membership
  try {
    const { fetchTeam } = await import('./api-client')
    const team = await fetchTeam(engagementId, session.apiToken)
    const isLead = team.some(
      (m) => m.assessorId === session.c3paoUser.id && m.role === 'LEAD_ASSESSOR',
    )
    return { session, isLead }
  } catch (e) {
    return { session, isLead: false, error: 'Failed to verify lead assessor status' }
  }
}
```

**Test:** mock `fetchTeam`, verify three cases — unauthenticated, global lead flag, engagement-role lead.

- [ ] **Steps 1-5:** write test, fail, implement, pass, commit:
```bash
git add lib/auth.ts lib/auth.test.ts
git commit -m "feat(auth): add requireLeadAssessor helper"
```

---

## Task 4: `lib/db-readiness.ts` — items CRUD

**Files:**
- Create: `lib/db-readiness.ts`
- Test: `lib/db-readiness.test.ts` (integration, uses real DB pool)

**Responsibility:** All SQL for readiness_checklist_items and readiness_artifacts. No business logic. Every function takes parameterized args. Exported API:

```ts
export async function ensureItemsSeeded(engagementId: string): Promise<void>
export async function getItems(engagementId: string): Promise<ReadinessItem[]>
export async function getItemByKey(engagementId: string, key: ReadinessItemKey): Promise<ReadinessItem | null>
export async function markItemComplete(engagementId: string, key: ReadinessItemKey, actor: Actor): Promise<ReadinessItem>
export async function unmarkItemComplete(engagementId: string, key: ReadinessItemKey): Promise<ReadinessItem>
export async function waiveItem(engagementId: string, key: ReadinessItemKey, reason: string, actor: Actor): Promise<ReadinessItem>
export async function unwaiveItem(engagementId: string, key: ReadinessItemKey): Promise<ReadinessItem>
export async function addArtifact(itemId: string, input: ArtifactInput): Promise<ReadinessArtifact>
export async function removeArtifact(artifactId: string): Promise<void>
export async function getArtifactContent(artifactId: string): Promise<{ filename: string; mimeType: string; content: Buffer } | null>
```

**Details:**
- `ensureItemsSeeded` uses `INSERT ... ON CONFLICT DO NOTHING` with all 8 keys.
- `getItems` joins items with artifacts (LEFT JOIN + aggregation) ordered by item definition order. Artifact `content` never selected here — only metadata. Use `ARRAY_AGG(json_build_object(...))` or a second query.
- `markItemComplete` sets status=`complete`, completed_by/at/email. After marking complete, if artifacts exist and status was `not_started`, derive `in_progress` first (tests should cover this).
- `unmarkItemComplete` clears completed fields; status becomes `in_progress` if artifacts exist else `not_started`.
- `waiveItem` requires reason (length ≥ 20); function trusts caller validated.
- `addArtifact` stores `bytea` content; returns metadata only.
- `getArtifactContent` is the only function that reads the blob — used by the download route.

**Testing approach:** integration tests against a real local test DB. Follow any existing pattern; otherwise use `DATABASE_URL=$TEST_DATABASE_URL` and clean tables in `beforeEach`.

- [ ] **Steps 1-5:** test, fail, implement, pass, commit:
```bash
git add lib/db-readiness.ts lib/db-readiness.test.ts
git commit -m "feat(db): add readiness items + artifacts data access layer"
```

---

## Task 5: `lib/db-audit.ts` — audit log writer + reader

**Files:**
- Create: `lib/db-audit.ts`
- Test: `lib/db-audit.test.ts`

```ts
export interface Actor { id: string; email: string; name: string }

export async function appendAudit(params: {
  engagementId: string
  itemId?: string | null
  actor: Actor
  action: AuditAction
  details?: Record<string, unknown>
}): Promise<void>

export async function getAuditLog(engagementId: string, opts?: { itemId?: string; limit?: number }): Promise<AuditEntry[]>
```

- Appends are non-throwing in practice (log errors, never fail callers) — but for tests they throw on DB error so we can assert behavior.
- Reader orders `created_at DESC`, default limit 500.

- [ ] **Steps 1-5:** test, fail, implement, pass, commit:
```bash
git add lib/db-audit.ts lib/db-audit.test.ts
git commit -m "feat(db): add audit log helpers"
```

---

## Task 6: `lib/db-notes.ts` — notes + revisions

**Files:**
- Create: `lib/db-notes.ts`
- Test: `lib/db-notes.test.ts`

```ts
export async function listNotes(engagementId: string): Promise<AssessmentNote[]>       // hides deleted
export async function getNote(noteId: string): Promise<AssessmentNote | null>
export async function createNote(input: { engagementId: string; author: Actor; body: string }): Promise<AssessmentNote>
export async function editNote(input: { noteId: string; editor: Actor; newBody: string }): Promise<AssessmentNote>
/** creates a revision row with the PREVIOUS body before overwriting */
export async function deleteNote(noteId: string, actor: Actor): Promise<void>          // soft delete
export async function listRevisions(noteId: string): Promise<NoteRevision[]>
```

- `editNote` runs inside a transaction: `SELECT body FOR UPDATE` → `INSERT INTO assessment_note_revisions (body=old)` → `UPDATE assessment_notes SET body=new, updated_at=NOW()`.
- `listNotes` returns rows with `revisionCount` computed via subquery.
- Author check (author-only edit/delete) is enforced in the server action layer, not here.

- [ ] **Steps 1-5:** test, fail, implement, pass, commit:
```bash
git add lib/db-notes.ts lib/db-notes.test.ts
git commit -m "feat(db): add assessment notes + revision helpers"
```

---

## Task 7: `lib/db-schedule.ts` — engagement schedule

**Files:**
- Create: `lib/db-schedule.ts`
- Test: `lib/db-schedule.test.ts`

```ts
export interface EngagementSchedule {
  engagementId: string
  kickoffDate: string | null
  onsiteStart: string | null
  onsiteEnd: string | null
  interviewSchedule: string | null
  deliverableDueDates: string | null
  phase1Target: string | null
  phase2Target: string | null
  phase3Target: string | null
  locationNotes: string | null
  updatedAt: string
  updatedBy: string | null
}

export async function getSchedule(engagementId: string): Promise<EngagementSchedule | null>
export async function upsertSchedule(input: { engagementId: string; actor: Actor; patch: Partial<EngagementSchedule> }): Promise<EngagementSchedule>
```

Upsert uses `INSERT ... ON CONFLICT (engagement_id) DO UPDATE`.

- [ ] **Steps 1-5:** commit:
```bash
git add lib/db-schedule.ts lib/db-schedule.test.ts
git commit -m "feat(db): add engagement schedule helpers"
```

---

## Task 8: `app/actions/c3pao-readiness.ts` — readers

**Files:**
- Create: `app/actions/c3pao-readiness.ts`
- Test: `app/actions/c3pao-readiness.test.ts`

Initial surface (expanded in later tasks):

```ts
'use server'
export async function getReadinessChecklist(engagementId: string): Promise<ActionResult<ReadinessChecklist>>
export async function getReadinessAuditLog(engagementId: string): Promise<ActionResult<AuditEntry[]>>
```

Behavior:
- `getReadinessChecklist` → requireAuth → `ensureItemsSeeded` → `getItems` → compute `completedCount`, `canStart`.
- `getReadinessAuditLog` → requireAuth → `getAuditLog` (limit 200).
- Both return the standard envelope.

Test: mock `lib/db-readiness`, `lib/db-audit`, `lib/auth`. Assert unauth returns error envelope; happy path returns data.

- [ ] **Commit:**
```bash
git add app/actions/c3pao-readiness.ts app/actions/c3pao-readiness.test.ts
git commit -m "feat(actions): readiness checklist + audit log read actions"
```

---

## Task 9: Readiness state actions — complete / uncomplete / waiver

**Files:**
- Modify: `app/actions/c3pao-readiness.ts` (append)
- Modify: `app/actions/c3pao-readiness.test.ts` (append)

```ts
export async function completeItem(engagementId: string, itemKey: ReadinessItemKey): Promise<ActionResult<ReadinessItem>>
export async function uncompleteItem(engagementId: string, itemKey: ReadinessItemKey): Promise<ActionResult<ReadinessItem>>
export async function grantWaiver(engagementId: string, itemKey: ReadinessItemKey, reason: string): Promise<ActionResult<ReadinessItem>>
export async function revokeWaiver(engagementId: string, itemKey: ReadinessItemKey): Promise<ActionResult<ReadinessItem>>
```

Each:
1. `requireLeadAssessor(engagementId)` — 403 envelope if not lead.
2. Validate input (waiver reason ≥ 20 chars, itemKey in `READINESS_ITEM_KEYS`).
3. Call corresponding `lib/db-readiness` function.
4. `appendAudit` with action and details `{ itemKey, reason? }`.
5. `revalidatePath('/engagements/[id]')` — refresh UI.

- [ ] **Commit:**
```bash
git add app/actions/c3pao-readiness.ts app/actions/c3pao-readiness.test.ts
git commit -m "feat(actions): readiness complete + waiver actions (lead only)"
```

---

## Task 10: Artifact upload + remove actions

**Files:**
- Modify: `app/actions/c3pao-readiness.ts`
- Modify: `app/actions/c3pao-readiness.test.ts`

```ts
export async function uploadArtifact(engagementId: string, itemKey: ReadinessItemKey, formData: FormData): Promise<ActionResult<{ id: string }>>
export async function removeArtifact(engagementId: string, itemKey: ReadinessItemKey, artifactId: string): Promise<ActionResult<void>>
```

- `uploadArtifact`: read `file: File` from FormData + optional `description`. Enforce 50 MB max (server-side — `file.size <= 50 * 1024 * 1024`). Enforce mime type allowlist (PDF, images, Office docs, txt, csv — reasonable defaults). Read file bytes into `Buffer.from(await file.arrayBuffer())`. Call `addArtifact`. Append audit `artifact_uploaded` with filename + size. Requires auth (any team member).
- `removeArtifact`: fetch artifact, verify uploader matches caller OR caller is lead (else 403). Call `removeArtifact`. Append audit.

Reject on size, bad mime, empty file, item not found, engagement mismatch.

- [ ] **Commit:**
```bash
git add app/actions/c3pao-readiness.ts app/actions/c3pao-readiness.test.ts
git commit -m "feat(actions): artifact upload/remove actions with size + mime checks"
```

---

## Task 11: `startAssessment` action + phase initialization

**Files:**
- Modify: `app/actions/c3pao-readiness.ts`
- Modify: `app/actions/c3pao-readiness.test.ts`
- Modify: `lib/api-client.ts` — ensure a `transitionEngagementPhase(engagementId, phase, token)` function exists (if not already). Inspect existing `c3pao-phase.ts` action to reuse its wrapper.

```ts
export async function startAssessment(engagementId: string): Promise<ActionResult<void>>
export async function ensureEngagementInPlanPhase(engagementId: string): Promise<ActionResult<void>>
```

- `ensureEngagementInPlanPhase`: read current engagement via `fetchEngagement`; if phase is empty/null/"PRE_ASSESS" (whatever the pre-plan state is), call phase transition to `PLAN`. Idempotent. Called from the readiness workspace on mount.
- `startAssessment`: `requireLeadAssessor`. Re-check checklist `canStart` server-side. Transition phase to `ASSESS` via Go API. Append audit `phase_advanced` with `{ from: 'PLAN', to: 'ASSESS' }`. revalidatePath.

- [ ] **Commit:**
```bash
git add app/actions/c3pao-readiness.ts app/actions/c3pao-readiness.test.ts lib/api-client.ts
git commit -m "feat(actions): startAssessment + phase initialization"
```

---

## Task 12: `app/actions/c3pao-notes.ts`

**Files:**
- Create: `app/actions/c3pao-notes.ts`
- Test: `app/actions/c3pao-notes.test.ts`

```ts
'use server'
export async function listNotes(engagementId: string): Promise<ActionResult<AssessmentNote[]>>
export async function createNote(engagementId: string, body: string): Promise<ActionResult<{ id: string }>>
export async function editNote(noteId: string, body: string): Promise<ActionResult<void>>
export async function deleteNote(noteId: string): Promise<ActionResult<void>>
export async function listNoteRevisions(noteId: string): Promise<ActionResult<NoteRevision[]>>
```

- `editNote` / `deleteNote`: load note, compare `authorId === session.c3paoUser.id`; 403 envelope otherwise.
- `createNote`: body length 1-10000, trimmed.
- Every mutation appends audit (`note_created` / `note_edited` / `note_deleted`).

- [ ] **Commit:**
```bash
git add app/actions/c3pao-notes.ts app/actions/c3pao-notes.test.ts
git commit -m "feat(actions): living notes (author-only edit/delete)"
```

---

## Task 13: `app/actions/c3pao-schedule.ts`

**Files:**
- Create: `app/actions/c3pao-schedule.ts`
- Test: `app/actions/c3pao-schedule.test.ts`

```ts
export async function getEngagementSchedule(engagementId: string): Promise<ActionResult<EngagementSchedule | null>>
export async function updateEngagementSchedule(engagementId: string, patch: Partial<EngagementSchedule>): Promise<ActionResult<EngagementSchedule>>  // lead only
```

- [ ] **Commit:**
```bash
git add app/actions/c3pao-schedule.ts app/actions/c3pao-schedule.test.ts
git commit -m "feat(actions): engagement schedule (lead-only updates)"
```

---

## Task 14: Artifact download API route

**Files:**
- Create: `app/api/c3pao/readiness/artifact/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getArtifactContent } from '@/lib/db-readiness'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const artifact = await getArtifactContent(id)
  if (!artifact) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(artifact.content, {
    headers: {
      'Content-Type': artifact.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(artifact.filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
```

Minimal test via Vitest + NextRequest mocks is optional — integration-test in E2E instead.

- [ ] **Commit:**
```bash
git add app/api/c3pao/readiness/artifact/[id]/route.ts
git commit -m "feat(api): artifact download route"
```

---

## Task 15: Export audit bundle API route

**Files:**
- Create: `app/api/c3pao/engagements/[id]/export-bundle/route.ts`
- Modify: `package.json` — add `archiver` dependency (`npm install archiver @types/archiver`)

```ts
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // requireLeadAssessor; else 403
  // open archiver zip stream
  // append manifest.json, checklist.json (getItems), audit-log.json (getAuditLog),
  //   notes.json (listNotes + listRevisions), artifacts one by one (stream bytes)
  // return new Response(archive as any, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="engagement-<id>-audit-<date>.zip"' } })
}
```

Use a PassThrough stream + `Response` body as a ReadableStream from `Readable.toWeb`. Archive each artifact by streaming `getArtifactContent` into `archive.append(buffer, { name: 'readiness/artifacts/<id>__<filename>' })`.

Audit-log this export (action `phase_advanced` is wrong — add `audit_exported` to `AuditAction` union and log it).

- [ ] **Commit:**
```bash
git add app/api/c3pao/engagements/[id]/export-bundle/route.ts lib/readiness-types.ts package.json package-lock.json
git commit -m "feat(api): export audit bundle (zip) route"
```

---

## Task 16: `ReadinessItemList` component

**Files:**
- Create: `components/c3pao/readiness/readiness-item-list.tsx`
- Test: `components/c3pao/readiness/readiness-item-list.test.tsx`

Props:
```ts
interface Props {
  items: ReadinessItem[]
  selectedKey: ReadinessItemKey
  onSelect: (key: ReadinessItemKey) => void
  progress: { completed: number; total: number }
}
```

Renders `<ul>` of 8 rows. Each row: status icon (use Lucide `Circle`, `CircleDashed`, `CircleDotDashed`, `CircleCheck`), title, one-line status summary (e.g. "Complete — L. Chen, Apr 19" or "2 artifacts, not yet marked"). Highlights selected row. Progress bar at top via shadcn `Progress` component.

- [ ] **Commit:**
```bash
git add components/c3pao/readiness/readiness-item-list.tsx components/c3pao/readiness/readiness-item-list.test.tsx
git commit -m "feat(ui): readiness item list (left column)"
```

---

## Task 17: `WaiverDialog` component

**Files:**
- Create: `components/c3pao/readiness/waiver-dialog.tsx`
- Test: `components/c3pao/readiness/waiver-dialog.test.tsx`

Uses shadcn `Dialog`, React Hook Form + Zod. Required reason ≥ 20 chars. `onSubmit(reason)` callback. Shows typical waiver reason as placeholder from `READINESS_ITEM_DEFINITIONS[key].typicalWaiverReason`.

- [ ] **Commit:**
```bash
git add components/c3pao/readiness/waiver-dialog.tsx components/c3pao/readiness/waiver-dialog.test.tsx
git commit -m "feat(ui): waiver dialog with required reason"
```

---

## Task 18: `ArtifactUpload` component

**Files:**
- Create: `components/c3pao/readiness/artifact-upload.tsx`
- Test: `components/c3pao/readiness/artifact-upload.test.tsx`

- Drag-drop zone (HTML5 drag events) + file input fallback
- Lists existing artifacts with filename, size (formatted), uploader+timestamp, download link (`/api/c3pao/readiness/artifact/${id}`), delete button (guarded by caller via `canDelete(artifact)` prop)
- Client-side size validation (50 MB). Toast on error via `sonner`.
- Calls `uploadArtifact` / `removeArtifact` server actions. Optimistic UI with rollback on failure.
- Hidden when `disabled` prop (item is waived).

- [ ] **Commit:**
```bash
git add components/c3pao/readiness/artifact-upload.tsx components/c3pao/readiness/artifact-upload.test.tsx
git commit -m "feat(ui): artifact upload zone + file list"
```

---

## Task 19: `ReadinessItemDetail` component

**Files:**
- Create: `components/c3pao/readiness/readiness-item-detail.tsx`
- Test: `components/c3pao/readiness/readiness-item-detail.test.tsx`

Renders three blocks: Artifacts (delegates to `ArtifactUpload`), Completion/Waiver (buttons state-dependent per spec), Activity (filtered audit feed). Props include `item`, `auditEntries`, `isLead`, and callback handlers (`onComplete`, `onReopen`, `onWaive`, `onRevokeWaiver`).

Completion block state logic per spec section "Readiness Workspace" — reproduce those four states precisely.

Activity feed: newest-first, 15 most recent, "Show all" → expands.

- [ ] **Commit:**
```bash
git add components/c3pao/readiness/readiness-item-detail.tsx components/c3pao/readiness/readiness-item-detail.test.tsx
git commit -m "feat(ui): readiness item detail pane"
```

---

## Task 20: `StartAssessmentButton` component

**Files:**
- Create: `components/c3pao/readiness/start-assessment-button.tsx`
- Test: `components/c3pao/readiness/start-assessment-button.test.tsx`

Props: `canStart: boolean`, `isLead: boolean`, `engagementId: string`. Disabled with helper text "Complete all 8 items to unlock (N/8)" when `!canStart` or `!isLead`. On click → `startAssessment(engagementId)` → on success, redirect to same page (refresh). Uses shadcn `Button` + loading state.

- [ ] **Commit:**
```bash
git add components/c3pao/readiness/start-assessment-button.tsx components/c3pao/readiness/start-assessment-button.test.tsx
git commit -m "feat(ui): Start Assessment button replaces Advance to Phase 2"
```

---

## Task 21: `ReadinessWorkspace` shell

**Files:**
- Create: `components/c3pao/readiness/readiness-workspace.tsx`
- Test: `components/c3pao/readiness/readiness-workspace.test.tsx`

Top-level client component. Props: `engagementId`, initial `checklist`, initial `auditEntries`, `isLead`. State: `selectedKey`. Layout: two columns on `md+`, stacked on mobile. Calls `ensureEngagementInPlanPhase` on mount (fire-and-forget, toast on error). Bottom bar with `StartAssessmentButton`.

- [ ] **Commit:**
```bash
git add components/c3pao/readiness/readiness-workspace.tsx components/c3pao/readiness/readiness-workspace.test.tsx
git commit -m "feat(ui): readiness workspace shell (two-column layout)"
```

---

## Task 22: Notes — `NoteCard` + `NoteHistoryDialog`

**Files:**
- Create: `components/c3pao/notes/note-card.tsx`
- Create: `components/c3pao/notes/note-history-dialog.tsx`
- Tests alongside each.

`NoteCard` props: `note`, `isAuthor`, `onEdit`, `onDelete`, `onViewHistory`. Shows author name + lead badge (if applicable), timestamp, body. Author-only action buttons. "Edited N times · [View history]" when `note.revisionCount > 0`.

`NoteHistoryDialog`: fetches revisions via `listNoteRevisions(noteId)`, displays in chronological order (oldest first), immutable.

- [ ] **Commit:**
```bash
git add components/c3pao/notes/note-card.tsx components/c3pao/notes/note-history-dialog.tsx components/c3pao/notes/note-card.test.tsx components/c3pao/notes/note-history-dialog.test.tsx
git commit -m "feat(ui): note card + revision history dialog"
```

---

## Task 23: Notes — `NoteEditor` modal + `NotesPanel`

**Files:**
- Create: `components/c3pao/notes/note-editor.tsx`
- Create: `components/c3pao/notes/notes-panel.tsx`
- Tests alongside each.

`NoteEditor`: shadcn `Dialog` with textarea. Used for both create and edit (prefill `initialBody` when editing). Required 1-10000 chars.

`NotesPanel`: top-level component for Review tab integration. Props: `engagementId`, `currentUserId`, `notes`. Fetches via `listNotes` client-side after mount for freshness. Handles create/edit/delete via server actions, refreshes on success. Lists newest-first.

- [ ] **Commit:**
```bash
git add components/c3pao/notes/note-editor.tsx components/c3pao/notes/notes-panel.tsx components/c3pao/notes/note-editor.test.tsx components/c3pao/notes/notes-panel.test.tsx
git commit -m "feat(ui): note editor + notes panel"
```

---

## Task 24: Engagement Overview subtab

**Files:**
- Create: `components/c3pao/engagement/engagement-overview.tsx`
- Test alongside.

Props: `engagement` (reuse existing type from `lib/api-client.ts`). Renders two cards: OSC summary (name, POCs, contract dates, phase chip), Engagement metadata (contract ref, owner, key dates, **Export audit bundle** button that links to `/api/c3pao/engagements/[id]/export-bundle`).

Export button visible only to lead (pass `isLead` prop).

- [ ] **Commit:**
```bash
git add components/c3pao/engagement/engagement-overview.tsx components/c3pao/engagement/engagement-overview.test.tsx
git commit -m "feat(ui): engagement overview subtab"
```

---

## Task 25: Engagement Schedule & Logistics subtab

**Files:**
- Create: `components/c3pao/engagement/engagement-schedule.tsx`
- Test alongside.

Form-driven. Pulls from `getEngagementSchedule`, saves via `updateEngagementSchedule`. Shadcn form fields (date pickers for the 6 date fields, textareas for the 3 text fields). Lead-only editing; non-leads see read-only.

- [ ] **Commit:**
```bash
git add components/c3pao/engagement/engagement-schedule.tsx components/c3pao/engagement/engagement-schedule.test.tsx
git commit -m "feat(ui): engagement schedule & logistics subtab"
```

---

## Task 26: Tab restructure in `engagement-detail.tsx`

**Files:**
- Modify: `components/c3pao/engagement-detail.tsx` (large — study first)

Changes:
1. Replace the flat `<TabsTrigger>` list with three visually grouped sections: **Package Data**, **Assessment**, **Engagement**. Use shadcn `Tabs` with a custom wrapper that displays group labels above each cluster (e.g., a two-row `TabsList` separated by group headings, or three `Tabs` nested inside a parent layout — pick whichever matches existing patterns best. If uncertain, look at `pmo-frontend` for inspiration, or use three separate horizontal tab rows stacked).
2. **Assessment → Planning** content: render `<ReadinessWorkspace>`, then `<EngagementTeamCard>` (moved from old `team` tab), then existing `<AssessmentPlanningBoard>`.
3. **Assessment → Review** content: keep whatever is there today (e.g., existing review component), then append `<NotesPanel>`.
4. **Engagement → Overview** new content: `<EngagementOverview>`.
5. **Engagement → Schedule & Logistics** new content: `<EngagementSchedule>`.
6. Delete the old `team`, `notes`, `details` triggers and their content sections.
7. Update initial tab selection if needed (likely stays on `overview` in Package Data).

Server-side: fetch readiness + audit + schedule + team data in the server component before passing into client components.

- [ ] **Commit:**
```bash
git add components/c3pao/engagement-detail.tsx
git commit -m "refactor(ui): restructure engagement tabs into Package Data / Assessment / Engagement"
```

---

## Task 27: Remove deprecated pre-assessment code

**Files:**
- Delete: `components/c3pao/engagement/pre-assessment-workspace.tsx`
- Modify: `app/actions/c3pao-preassess.ts` — remove `getPreAssessChecklist` and `updatePreAssessChecklist` functions AND their types (`PreAssessResponse`). Keep `getCustomerReadiness` and `confirmCustomerReadiness` (separate feature, still in use).
- Modify: `lib/api-client.ts` — remove unused `fetchPreAssess` and `updatePreAssess` functions and the `PreAssessChecklist` / `UpdatePreAssessInput` types.
- Grep for any remaining imports/references and fix them.

**Verification:**
```bash
npm run lint
npm run test -- --silent
```

- [ ] **Commit:**
```bash
git add -u
git commit -m "chore: remove deprecated pre-assessment Go API client + workspace"
```

---

## Task 28: Phase tracker visual fix

**Files:**
- Inspect + modify the phase tracker component rendered at the top of the engagement detail page. Start by grepping for `phase` inside `components/c3pao/engagement-detail.tsx` to locate the component. Likely candidate: `components/c3pao/engagement/engagement-phase-tracker.tsx` or inline JSX.

Fixes:
1. Ensure component re-renders when `engagement.phase` changes. If it's an inline map based on a prop, it should already work — the bug is likely that `startAssessment`'s `revalidatePath` isn't triggering a re-fetch. If so, use `revalidatePath('/engagements/[id]', 'page')` with the proper route segment.
2. Visual: active phase filled/highlighted, completed phases show a checkmark, future phases muted. Use Tailwind classes consistent with existing design.
3. If the component is stateful (client component holding a stale phase), lift state to server component props.

**Verification:** manual — after `startAssessment` succeeds, reload engagement page (if revalidation works) and tracker shows `ASSESS` as active.

- [ ] **Commit:**
```bash
git add components/c3pao/engagement-detail.tsx components/c3pao/engagement/
git commit -m "fix(ui): phase tracker reflects live phase + highlights progress"
```

---

## Task 29: E2E smoke test with playwright-cli

**Files:**
- Create: `tests/e2e/pre-assessment-readiness.spec.ts` (if project uses a playwright test runner) OR a manual-ish script under `scripts/e2e-readiness.sh`.

Steps (using `playwright-cli -s="${CLAUDE_SESSION_ID:-default}"`):
1. `open` → login as lead assessor
2. navigate to an engagement → Assessment → Planning
3. Verify readiness workspace renders with 8 items, 0/8
4. Upload an artifact to `contract_executed` via drag-drop simulation
5. Mark complete; verify item shows complete chip
6. Waive `boe_confirmed` with reason; verify waived chip
7. Complete remaining 6 items (can waive all for speed)
8. Click Start Assessment; verify phase tracker advances to ASSESS
9. As a second user (non-lead): verify controls are hidden
10. `close`

- [ ] **Commit:**
```bash
git add tests/e2e/pre-assessment-readiness.spec.ts
git commit -m "test(e2e): pre-assessment readiness smoke flow"
```

---

## Task 30: Docs + CHANGELOG + verify

**Files:**
- Modify: `CLAUDE.md` — correct the stale SQLite reference (project now uses Postgres via `pg`), add note about readiness workspace
- Modify: `CHANGELOG.md` (create if missing) — add entry for this feature
- Run: `npm run lint`, `npm run test -- --silent`, `npm run build`

- [ ] **Commit:**
```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: document pre-assessment readiness redesign + fix stale CLAUDE.md"
```

---

## Out-of-band engineering notes

- **GPG signing:** user's local git is configured with GPG signing but has no secret key. Execution will need either a configured key or the user to grant `--no-gpg-sign` for this branch.
- **Test database:** integration tests (Tasks 1, 4, 5, 6, 7) need a disposable Postgres. If the project doesn't already have a fixture, set `TEST_DATABASE_URL` and create/drop tables in `beforeAll`/`afterAll`.
- **Staged rollout option:** if scope is too large to ship at once, feature-flag the new readiness workspace behind an env var and keep the old component renderable for one release cycle. Not required by the spec but worth considering.
