# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Pre-Assessment Readiness redesign: fully manual, artifact-backed 8-item checklist with lead-assessor sign-off, optional waivers with written reasons, and complete audit trail. Replaces the mixed manual/auto-derived checklist that preceded it.
- Living notes panel on the Review tab — authors can edit their own notes, all edits preserved as an immutable revision log for non-repudiation.
- Engagement → Overview subtab with OSC summary, engagement metadata, and lead-only audit-bundle export.
- Engagement → Schedule & Logistics subtab with kickoff date, on-site window, phase targets, and location notes.
- Export audit bundle (`GET /api/c3pao/engagements/[id]/export-bundle`) — streams a zip containing manifest, checklist, audit log, notes, and all readiness artifacts.
- Artifact download endpoint (`GET /api/c3pao/readiness/artifact/[id]`).
- New local Postgres tables: `readiness_checklist_items`, `readiness_artifacts` (bytea blobs), `assessment_notes`, `assessment_note_revisions`, `readiness_audit_log`, `engagement_schedule`. All local-only, no Go API changes.
- `requireLeadAssessor(engagementId)` auth helper.
- 113 new tests (302 → 474 total).

### Changed
- Assessment → Planning tab now contains: readiness workspace → assessment team → planning board.
- Assessment → Review tab gains the notes panel.
- Phase tracker at top of engagement detail now accepts `initialPhase` from the server component, so it re-renders correctly after `router.refresh()` (fixes stale phase display after Start Assessment).
- "Advance to Phase 2" button replaced with "Start Assessment" — disabled until all 8 items are complete or waived.
- Engagement phase is automatically initialized to `PRE_ASSESS` when the readiness workspace first loads for an engagement whose phase is null/empty (fixes the `cannot move from "" to "ASSESS"` error).

### Removed
- Old `pre-assessment-workspace.tsx` component (Go-API-backed mixed manual/derived checklist).
- Old top-level `team`, `notes`, `details` tabs (team folded into Planning, notes relocated to Review, details removed).
- `getPreAssessChecklist` and `updatePreAssessChecklist` server actions.
- `fetchPreAssess` and `updatePreAssess` from `lib/api-client.ts`.
