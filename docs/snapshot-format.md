# OSC Assessment Snapshot Package Format — `v1`

The contract between the Go exporter (`bedrock-cmmc-api`) and the c3pao TypeScript
importer. An OSC produces this package from the online platform; the air-gapped assessor
imports it. See ADR 0001 (CUI boundary) and ADR 0002 (offline architecture).

## Zip layout

```
<engagement>-snapshot-v1.zip
├── manifest.json                       # format version, source ids, table + evidence index, checksums
├── tables/
│   ├── AssessmentEngagement.json       # one file per snapshot table; array of raw rows
│   ├── AtoPackage.json
│   ├── RequirementStatus.json
│   └── … (one per snapshot table — see "Data classes")
├── evidence/
│   └── <evidenceId>/<originalFilename>  # raw evidence bytes, content-addressed by evidence id
└── evidence-links.json                  # evidence → objective mappings
```

## `manifest.json`

```jsonc
{
  "formatVersion": "v1",
  "createdAt": "2026-06-30T00:00:00.000Z",   // ISO-8601 UTC
  "source": {
    "engagementId": "<uuid>",
    "atoPackageId": "<uuid>",
    "organizationId": "<uuid>"                // the OSC org (needed for org-scoped tables)
  },
  "tables": {                                  // one entry per tables/*.json file
    "AssessmentEngagement": { "rowCount": 1 },
    "RequirementStatus":    { "rowCount": 110 }
  },
  "evidence": { "count": 42, "totalBytes": 123456789 },
  "checksums": {                               // SHA-256 hex of every packaged file, path relative to zip root
    "tables/AssessmentEngagement.json": "<sha256>",
    "evidence/<evidenceId>/<file>":     "<sha256>"
  }
}
```

The importer **rejects** the package if `formatVersion` is unknown or any checksum mismatches.

## `tables/<TableName>.json`

An array of **raw rows** exactly as the Go snapshot emits them (the `gatherSnapshot`
shape): column → value maps, with UUIDs rendered as canonical strings and timestamps as
ISO-8601 strings (`normalizeVal`/`formatUUID`). The importer loads these verbatim into the
`imp_<table>` raw tables (plan Task 3); the `lib/local/*` layer assembles API view shapes
from them at read time.

## `evidence-links.json`

```jsonc
[
  { "evidenceId": "<uuid>", "objectiveId": "03.01.01.a", "requirementId": "03.01.01" }
]
```

Loaded into the evidence↔objective link table so control mappings survive the round-trip.

## Data classes — what travels vs. what does NOT

Three distinct data sources; only class (1) is in this package.

**(1) Snapshot (in this package), scoping key per table.** Finalized against the Go schema by
the export plan (Task 5); a flat `engagement_id` filter is wrong — the exporter walks the
`engagement → atoPackage → organization` graph.

| Table | Scope key |
|-------|-----------|
| `AssessmentEngagement` | `id = engagementId` |
| `AtoPackage` | `id = atoPackageId` |
| `Organization`, `Customer` (the OSC) | `id = organizationId` |
| `ObjectiveStatus`, `ObjectiveStatusSnapshot`, `AssessmentSnapshot`, `AssessmentFinding`, `AssessmentReport`, `EngagementComment`, `EvidenceObjectiveMapping` | `engagementId` |
| `RequirementStatus`, `Evidence`, `Poam`, SSP tables, `Asset` | `organizationId` |
| `ExternalServiceProvider`, `EspRequirementMapping` | `organizationId` / via ESP |

**(2) Reference catalog — SEEDED in c3pao, never imported** (plan Task 23): `Requirement`
(110), `RequirementFamily` (14), `AssessmentObjective` (320 + examine/interview/test
guidance), CCI mappings. Imported `ObjectiveStatus` rows key (`03.01.01.a…`) into this
seeded catalog.

**(3) C3PAO-org-local — provisioned/computed in the container, NOT from the OSC:** assessor
accounts + identities, `EngagementAssessor` / `AssessorDomainAssignment` team assignments,
`AssessorSkill`, profile/license, C3PAO users/organization, notifications, `QaReview`,
`CoiDisclosure`. Aggregates (workload, portfolio, progress) are computed locally over the
engagements present in this container.

## Versioning

`formatVersion` is bumped on any breaking change. The importer supports exactly the versions
it knows; a golden `v1` fixture (`tests/fixtures/snapshot-v1/`) is the conformance reference
for both the exporter and the importer.
