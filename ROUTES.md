# C3PAO Standalone Routes

Complete route map for the C3PAO standalone assessment portal.

## Page Routes

| Route | Description | Auth |
|-------|-------------|------|
| `/` | Root redirect (to `/login` or dashboard) | No |
| `/login` | C3PAO assessor login | No |
| `/` (dashboard) | Dashboard home — stats, quick actions, recent engagements | Yes |
| `/engagements` | List all engagements assigned to this C3PAO | Yes |
| `/engagements/[id]` | Engagement detail — controls, evidence, findings | Yes |
| `/engagements/[id]/control/[controlId]` | Individual control assessment view | Yes |
| `/engagements/[id]/stigs` | STIG checklists overview for engagement | Yes |
| `/engagements/[id]/stigs/[targetId]` | STIG target detail viewer | Yes |
| `/engagements/[id]/emass-export` | eMASS export wizard | Yes |
| `/engagements/[id]/report` | Assessment report generation | Yes |
| `/profile` | Assessor profile | Yes |
| `/team` | C3PAO team members | Yes |
| `/workload` | Team workload distribution | Yes |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check — sync status, pending items, heartbeat |

## SaaS API Endpoints Required

The standalone app fetches all data from the Bedrock CMMC SaaS via these API endpoints.
All requests include `x-instance-api-key` and `Authorization: Bearer <assessorToken>` headers.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/instance/auth/login` | Validate assessor credentials, return token + user info |

### Engagements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instance/engagements` | List engagements for this C3PAO instance |
| GET | `/api/v1/instance/engagements/[id]` | Get single engagement with access level |
| PUT | `/api/v1/instance/engagements/[id]/status` | Update engagement status |

### Controls

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instance/engagements/[id]/controls` | List controls for engagement |
| GET | `/api/v1/instance/engagements/[id]/controls/[controlId]` | Get control detail |

### Evidence

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instance/engagements/[id]/evidence` | List evidence for engagement |
| GET | `/api/v1/instance/engagements/[id]/evidence/[evidenceId]/file` | Download evidence file |

### POAMs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instance/engagements/[id]/poams` | List POAMs for engagement |

### STIGs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instance/engagements/[id]/stigs` | List STIG results for engagement |
| GET | `/api/v1/instance/engagements/[id]/stigs/[targetId]` | Get STIG target detail |

### Team

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instance/team` | List C3PAO team members |
| GET | `/api/v1/instance/engagements/[id]/team` | List team assigned to engagement |

### Assessment (Push from standalone to SaaS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/instance/engagements/[id]/findings` | Push all findings for engagement |
| POST | `/api/v1/instance/engagements/[id]/findings/[findingId]` | Push single finding |
| POST | `/api/v1/instance/engagements/[id]/report` | Push assessment report |

### Reference Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instance/reference/cmmc-domains` | CMMC domains reference data |

### Heartbeat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/instance/heartbeat` | Instance heartbeat / connectivity check |

## Stale Routes (to clean up)

These routes were copied from bedrock-cmmc and reference pages that don't exist in the standalone:

| Reference | File | Action Needed |
|-----------|------|---------------|
| `/forgot-password?type=C3PAO_USER` | `components/c3pao/c3pao-login-form.tsx:67` | Remove or hide link |
| `/cmmc/poams` | `components/poam/DeletePOAMButton.tsx:40` | Remap to engagement context |
| `/cmmc/poams/[id]` | `components/poam/POAMList.tsx:96,109` | Remap to engagement context |
| `/cmmc/poams/[id]` | `components/poam/POAMForm.tsx:107,142` | Remap to engagement context |
| `/cmmc/ato-packages/[id]/requirements/[id]` | `components/poam/POAMList.tsx:125,136` | Remap to engagement context |
| `/cmmc/ato-packages/[id]/poams` | `components/poam/POAMDashboard.tsx:68,87` | Remap to engagement context |
| `/cmmc/packages/[id]` | `components/assessment-mode-banner.tsx:53` | Remap to `/engagements/[id]` |
| `/cmmc/packages/[id]/stigs` | `components/stig/STIGTargetDetails.tsx:93` | Remap to `/engagements/[id]/stigs` |
| `/cmmc/packages/[id]/assets` | `components/stig/STIGTargetTable.tsx:126` | Remove or remap |
