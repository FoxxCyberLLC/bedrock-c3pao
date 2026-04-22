/**
 * Data access for the one-row-per-engagement schedule record.
 * Uses INSERT ... ON CONFLICT DO UPDATE for upserts.
 */

import { query } from './db'

export interface Actor {
  id: string
  email: string
  name: string
}

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

interface ScheduleRow {
  engagement_id: string
  kickoff_date: string | Date | null
  onsite_start: string | Date | null
  onsite_end: string | Date | null
  interview_schedule: string | null
  deliverable_due_dates: string | null
  phase_1_target: string | Date | null
  phase_2_target: string | Date | null
  phase_3_target: string | Date | null
  location_notes: string | null
  updated_at: string | Date
  updated_by: string | null
}

function dateToIso(v: string | Date | null): string | null {
  if (v === null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  // Accept either ISO timestamps or YYYY-MM-DD strings from the driver.
  return v
}

function toIso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v
}

function mapRow(row: ScheduleRow): EngagementSchedule {
  return {
    engagementId: row.engagement_id,
    kickoffDate: dateToIso(row.kickoff_date),
    onsiteStart: dateToIso(row.onsite_start),
    onsiteEnd: dateToIso(row.onsite_end),
    interviewSchedule: row.interview_schedule,
    deliverableDueDates: row.deliverable_due_dates,
    phase1Target: dateToIso(row.phase_1_target),
    phase2Target: dateToIso(row.phase_2_target),
    phase3Target: dateToIso(row.phase_3_target),
    locationNotes: row.location_notes,
    updatedAt: toIso(row.updated_at),
    updatedBy: row.updated_by,
  }
}

/** Fetch the schedule row, or null if the engagement has no row yet. */
export async function getSchedule(engagementId: string): Promise<EngagementSchedule | null> {
  const result = await query(
    `SELECT engagement_id, kickoff_date, onsite_start, onsite_end,
            interview_schedule, deliverable_due_dates,
            phase_1_target, phase_2_target, phase_3_target,
            location_notes, updated_at, updated_by
     FROM engagement_schedule
     WHERE engagement_id = $1`,
    [engagementId],
  )
  const row = result.rows[0] as ScheduleRow | undefined
  return row ? mapRow(row) : null
}

// Camel → snake field map for the updatable columns.
const FIELD_MAP: Record<string, string> = {
  kickoffDate: 'kickoff_date',
  onsiteStart: 'onsite_start',
  onsiteEnd: 'onsite_end',
  interviewSchedule: 'interview_schedule',
  deliverableDueDates: 'deliverable_due_dates',
  phase1Target: 'phase_1_target',
  phase2Target: 'phase_2_target',
  phase3Target: 'phase_3_target',
  locationNotes: 'location_notes',
}

export interface UpsertScheduleInput {
  engagementId: string
  actor: Actor
  patch: Partial<Omit<EngagementSchedule, 'engagementId' | 'updatedAt' | 'updatedBy'>>
}

/**
 * Upsert the schedule row. Patch keys not present are preserved on update
 * (or left NULL on insert).
 */
export async function upsertSchedule(input: UpsertScheduleInput): Promise<EngagementSchedule> {
  const columns: string[] = ['engagement_id', 'updated_at', 'updated_by']
  const placeholders: string[] = ['$1', 'NOW()', '$2']
  const params: unknown[] = [input.engagementId, input.actor.name]

  for (const [camel, value] of Object.entries(input.patch)) {
    const column = FIELD_MAP[camel]
    if (!column) continue
    params.push(value)
    columns.push(column)
    placeholders.push(`$${params.length}`)
  }

  const updateAssignments: string[] = ['updated_at = NOW()', 'updated_by = EXCLUDED.updated_by']
  for (const camel of Object.keys(input.patch)) {
    const column = FIELD_MAP[camel]
    if (!column) continue
    updateAssignments.push(`${column} = EXCLUDED.${column}`)
  }

  const sql = `
    INSERT INTO engagement_schedule (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (engagement_id) DO UPDATE
    SET ${updateAssignments.join(', ')}
    RETURNING engagement_id, kickoff_date, onsite_start, onsite_end,
              interview_schedule, deliverable_due_dates,
              phase_1_target, phase_2_target, phase_3_target,
              location_notes, updated_at, updated_by
  `

  const result = await query(sql, params)
  return mapRow(result.rows[0] as ScheduleRow)
}
