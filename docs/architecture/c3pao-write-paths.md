# C3PAO Write-Back Paths

> **Regenerate this doc whenever a C3PAO server action is added, removed, or renamed.**
> Last reviewed: spec `2026-04-22-c3pao-assessment-flow-wiring`.

The C3PAO container is **read-mostly**. It pulls the contractor's ATO package from the
Go API as read-only data and writes back only two classes of updates:

1. **Go API writes** — assessment progress + final determination (shared with the OSC)
2. **Local Postgres writes** — C3PAO-private assessment artifacts (NEVER sent to OSC)

## Resources the C3PAO does NOT write

All authoring for these lives in the OSC frontend (`bedrock-cmmc`). The C3PAO reads
them via the Go API only:

- Evidence (upload, delete, link, unlink)
- POAMs (create, update, close, delete)
- POAM milestones (any CRUD)
- External Service Providers (ESPs)
- System Security Plan (SSP)
- Asset inventory
- STIG imports / checklists / rules (OSC imports CKLB files; C3PAO only views)
- Contractor-side pre-assessment readiness items
- Assessor passwords (handled by the local admin at `/admin`, not by team leads)

If a future server action introduces a write for any of these, it violates the
read-mostly architecture and must be rejected in code review.

## Go API write-back paths

Every write goes: **UI component → server action (`app/actions/*.ts`) → `lib/api-client.ts` → Go API endpoint**.

Each server action begins with `'use server'` and checks `requireAuth()` before
calling any api-client function. Failed auth returns `{ success: false, error: 'Unauthorized' }`.

| Category | UI entry (file:line) | Server action (file:line) | api-client fn | Go API endpoint |
|---|---|---|---|---|
| Objective status change | `components/c3pao/objective-assessment-card.tsx:259` | `assessorUpdateObjectiveStatus` — `app/actions/c3pao-dashboard.ts` | `updateObjective` | `PUT /c3pao/assessments/{id}/objectives/{oid}` |
| Control assessment notes | `components/c3pao/control-detail-page.tsx:228` | `updateAssessorNotes` — `app/actions/c3pao-dashboard.ts` | `updateControlNotes` | `PATCH /c3pao/assessments/{id}/controls/{rid}/notes` |
| Findings (create/update) | `components/c3pao/control-detail-page.tsx` (findings editor) | `assessment.ts` | `createFinding`, `updateFinding` | `POST /c3pao/assessments/{id}/findings`, `PUT /c3pao/assessments/{id}/findings/{fid}` |
| Finding review (QA approval) | Findings UI | `assessment.ts` | `reviewFinding` | `PATCH /c3pao/assessments/{id}/findings/{fid}/review` |
| Engagement notes | Engagement detail notes section | `c3pao-notes.ts` | `createNote` | `POST /c3pao/assessments/{id}/notes` |
| Daily check-ins | `components/c3pao/checkin-card.tsx` | `createAssessmentCheckin` — `app/actions/c3pao-dashboard.ts:535` | `createCheckin` | `POST /c3pao/assessments/{id}/checkins` |
| Engagement comments (@mentions) | `components/c3pao/engagement/engagement-comments.tsx` | `createEngagementComment` — `c3pao-comments.ts` | `createEngagementComment` | `POST /c3pao/assessments/{id}/comments` |
| Notification read-state | Inbox | `notifications-inapp.ts` | `apiMarkNotificationRead`, `apiMarkAllNotificationsRead` | `PATCH /c3pao/notifications/{id}/read`, `POST /c3pao/notifications/read-all` |
| Phase transitions (Phase 1 → 2 → final) | Phase advance button | `c3pao-phase.ts` | `updateEngagementPhase` | `PUT /c3pao/assessments/{id}/phase` |
| Engagement status | Engagement detail status control | `engagements.ts` / `c3pao-dashboard.ts` | `updateEngagementStatus` | `PATCH /c3pao/assessments/{id}/status` |
| Assessment mode toggle | Assessment mode banner | `assessment-mode.ts` | `toggleAssessmentMode` | `POST /c3pao/assessments/{id}/assessment-mode` |
| QA reviews (Phase 1 gate) | QA review queue | `c3pao-qa.ts` | `createQAReview`, `updateQAReview` | `POST /c3pao/assessments/{id}/qa-reviews`, `PATCH /c3pao/qa-reviews/{id}` |
| Customer readiness confirmations | Readiness page | `c3pao-readiness.ts` | `confirmCustomerReadinessItem` | `POST /c3pao/assessments/{id}/customer-readiness/{itemType}/confirm` |
| Planning / scheduling | Planning page | `c3pao-assessment.ts`, `c3pao-dashboard.ts` | `updatePlanning`, `sendProposal`, `acknowledgeIntroduction` | `PUT /c3pao/assessments/{id}/planning`, `POST .../planning/proposal`, `POST .../planning/acknowledge` |
| COI disclosures | COI register | `c3pao-coi.ts` | `createCOI`, `updateCOI` | `POST /c3pao/coi`, `PATCH /c3pao/coi/{id}` |
| Team/domain assignment (roster) | Team page + edit dialog | `c3pao-team-assignment.ts`, `c3pao-dashboard.ts` | `addTeamMember`, `updateTeamMemberRole`, `removeTeamMember`, `setAssessorDomains` | `POST /c3pao/assessments/{id}/team`, `PATCH .../team/{aid}/role`, `DELETE .../team/{aid}`, `PUT .../domains/{aid}` |
| Profile updates | Profile page | `c3pao-dashboard.ts` | `updateProfile` | `PATCH /c3pao/profile` |
| Assessor skills/credentials | Profile / skills page | `c3pao-dashboard.ts` | `updateAssessorSkills` | `PUT /c3pao/users/{uid}/skills` |
| Report drafts & finalization | `app/(dashboard)/engagements/[id]/report/page.tsx:259` | `saveAssessmentReport`, `updateReportStatus` — `c3pao-assessment.ts` | `saveAssessmentReport`, `updateReportStatus` | `POST /c3pao/assessments/{id}/report/assessment`, `PATCH .../report/assessment/status` |

**Final determination flow:** assessor completes all objectives → clicks "Submit for
Review" on the report page (`report/page.tsx:259`) → `updateReportStatus` → `PATCH
/c3pao/assessments/{id}/report/assessment/status` → OSC sees the approved report.

## Local Postgres writes (C3PAO-private, never sent to OSC)

These writes hit the C3PAO container's own Postgres instance (`lib/db.ts`). The data
stays inside the VDI; the OSC never sees it. Tables live in `lib/db-*.ts` modules.

| Category | UI / server action | DB module + function | Table(s) |
|---|---|---|---|
| Pre-assessment readiness checklist | Readiness page | `lib/db-readiness.ts` (upsertItem, markComplete) | `readiness_items`, `readiness_artifacts` |
| Readiness artifacts (bytea blobs) | Readiness upload | `lib/db-readiness.ts` (saveArtifact) | `readiness_artifacts` |
| Living notes + revisions | Notes UI | `lib/db-notes.ts` (insertNote, upsertRevision) | `notes`, `note_revisions` |
| Audit log | Every server action writes an audit entry | `lib/db-audit.ts` (log) | `audit_log` |
| Engagement schedule (local calendar) | Schedule page | `lib/db-schedule.ts` (upsertEvent) | `schedule_events` |

**Why local:** these are working artifacts for the assessor team. They contain
in-progress notes and personally identifiable assessor commentary that should not
leave the assessor's VDI until the final determination is submitted.

**Backup strategy:** the `c3pao-data` Docker volume is expected to be backed up by
the VDI host; there is no cloud sync by design (air-gap compliant).

## Verifying this doc

Run these commands periodically (or add to CI):

```bash
# 1. No stub strings survive anywhere
grep -rn "not available in standalone mode\|not yet available via API\|StubResult" \
  --include="*.ts" --include="*.tsx" bedrock-c3pao/app bedrock-c3pao/lib
# Expected: zero matches.

# 2. No /cmmc/ hrefs in source
grep -rn "href=.*\"/cmmc/\|router\.push(.*'/cmmc/" \
  --include="*.ts" --include="*.tsx" bedrock-c3pao/app bedrock-c3pao/components
# Expected: zero matches.

# 3. The core assessment write paths test
cd bedrock-c3pao && npm run test -- c3pao-esp c3pao-checkins
# Expected: all pass.
```
