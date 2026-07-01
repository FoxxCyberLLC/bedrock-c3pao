/**
 * CMMC L2 reference catalog seed (Task 23).
 *
 * This is SEEDED reference data — 14 requirement families, 110 NIST 800-171 Rev 2
 * requirements, 321 NIST 800-171A assessment objectives (with examine/interview/test
 * guidance), and the CCI ↔ NIST 800-53 crosswalk. It NEVER travels in an OSC snapshot;
 * imported `ObjectiveStatus` rows (keyed `03.01.01.a`) join against the seeded objectives.
 *
 * The data is the platform's authoritative catalog, copied verbatim from the Go API
 * migrations 003–006 into `lib/reference/data/*.sql` (zero transcription risk). The upserts
 * are idempotent (`ON CONFLICT`), so re-seeding is safe; a count guard skips the work once
 * the catalog is present. Replaces `outside_osc`'s synthesized one-objective-per-control
 * catalog so imported AND outside engagements share one authoritative source.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Full 800-171A objective count in the authoritative platform catalog. */
export const EXPECTED_OBJECTIVES = 321

/** Minimal shape shared by `pg.Pool` and `pg.PoolClient`. */
interface Queryable {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
}

/**
 * Consolidated DDL for the four reference tables. Columns and unique keys match the
 * platform schema the seed files (003–006) upsert against: family(`code`),
 * requirement(`requirementId`), objective(`objectiveReference`), cci(`cci`).
 */
export const REFERENCE_DDL = `
  CREATE TABLE IF NOT EXISTS "RequirementFamily" (
    "id"              TEXT PRIMARY KEY,
    "code"            TEXT NOT NULL UNIQUE,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "sortOrder"       INTEGER NOT NULL DEFAULT 0,
    "conmonFrequency" TEXT
  );

  CREATE TABLE IF NOT EXISTS "Requirement" (
    "id"                                TEXT PRIMARY KEY,
    "requirementId"                     TEXT NOT NULL UNIQUE,
    "familyId"                          TEXT NOT NULL,
    "title"                             TEXT NOT NULL,
    "basicRequirement"                  TEXT NOT NULL,
    "derivedRequirement"                TEXT,
    "discussion"                        TEXT NOT NULL,
    "furtherDiscussion"                 TEXT,
    "exampleOne"                        TEXT,
    "exampleTwo"                        TEXT,
    "potentialAssessmentConsiderations" TEXT,
    "keyReferences"                     TEXT,
    "relatedControls"                   TEXT,
    "cmmcLevel"                         TEXT NOT NULL DEFAULT 'LEVEL_2',
    "sortOrder"                         INTEGER NOT NULL DEFAULT 0,
    "createdAt"                         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"                         TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS "AssessmentObjective" (
    "id"                 TEXT PRIMARY KEY,
    "requirementId"      TEXT NOT NULL,
    "objectiveId"        TEXT NOT NULL,
    "objectiveReference" TEXT NOT NULL UNIQUE,
    "description"        TEXT NOT NULL,
    "examineGuidance"    TEXT,
    "interviewGuidance"  TEXT,
    "testGuidance"       TEXT,
    "sortOrder"          INTEGER NOT NULL DEFAULT 0,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS "CCIMapping" (
    "id"                   TEXT PRIMARY KEY,
    "cci"                  TEXT NOT NULL UNIQUE,
    "definition"           TEXT NOT NULL,
    "nist80053Control"     TEXT NOT NULL,
    "nist80053ControlFull" TEXT,
    "controlType"          TEXT,
    "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS "idx_requirement_family" ON "Requirement" ("familyId");
  CREATE INDEX IF NOT EXISTS "idx_objective_requirement" ON "AssessmentObjective" ("requirementId");
`

const DATA_DIR = path.join(process.cwd(), 'lib', 'reference', 'data')

/** Load one of the copied platform seed SQL files. */
function readSeed(fileName: string): string {
  return readFileSync(path.join(DATA_DIR, fileName), 'utf8')
}

/**
 * Create the reference tables and seed the catalog if it is not already present.
 * Idempotent: a count guard skips the (large) inserts once objectives exist. Seed order
 * matters — objective inserts subselect their requirement id, so requirements load first.
 */
export async function seedReferenceCatalog(pool: Queryable): Promise<void> {
  await pool.query(REFERENCE_DDL)

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM "AssessmentObjective"')
  const present = Number(rows[0]?.n ?? 0)
  if (present >= EXPECTED_OBJECTIVES) return

  await pool.query(readSeed('families.sql'))
  await pool.query(readSeed('requirements.sql'))
  await pool.query(readSeed('objectives.sql'))
  await pool.query(readSeed('cci-mappings.sql'))
}
