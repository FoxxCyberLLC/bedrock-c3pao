/**
 * Local (air-gapped) customer readiness — Task 18 (readiness).
 *
 * The C3PAO's confirmation of the OSC's pre-assessment readiness items. C3PAO-local (the assessor
 * confirms items as reviewed) in `local_customer_readiness`. No network.
 */
import { query } from '@/lib/db'
import type { CustomerReadinessItem, CustomerReadinessItemType } from '@/lib/api-client'

export const READINESS_SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS local_customer_readiness (
    engagement_id        TEXT NOT NULL,
    item_type            TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'PENDING',
    customer_note        TEXT,
    evidence_url         TEXT,
    c3pao_confirmed_at   TIMESTAMPTZ,
    last_updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_by_type TEXT,
    PRIMARY KEY (engagement_id, item_type)
  );`

interface Queryable {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
}

export async function ensureReadinessSchema(pool: Queryable): Promise<void> {
  await pool.query(READINESS_SCHEMA_DDL)
}

const iso = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v))

function mapItem(r: Record<string, unknown>): CustomerReadinessItem {
  return {
    itemType: String(r.item_type) as CustomerReadinessItemType,
    status: String(r.status),
    customerNote: r.customer_note != null ? String(r.customer_note) : null,
    evidenceUrl: r.evidence_url != null ? String(r.evidence_url) : null,
    c3paoConfirmedAt: iso(r.c3pao_confirmed_at),
    lastUpdatedAt: iso(r.last_updated_at),
    lastUpdatedByType: r.last_updated_by_type != null ? String(r.last_updated_by_type) : null,
  }
}

/** The C3PAO's readiness confirmations for the engagement. */
export async function getLocalCustomerReadiness(engagementId: string): Promise<CustomerReadinessItem[]> {
  const result = await query(
    `SELECT * FROM local_customer_readiness WHERE engagement_id = $1 ORDER BY item_type`,
    [engagementId]
  )
  return result.rows.map(mapItem)
}

/** Confirm a readiness item as reviewed by the C3PAO (idempotent upsert). */
export async function confirmLocalCustomerReadinessItem(
  engagementId: string,
  itemType: CustomerReadinessItemType
): Promise<CustomerReadinessItem> {
  const now = new Date().toISOString()
  await query(
    `INSERT INTO local_customer_readiness (engagement_id, item_type, status, c3pao_confirmed_at, last_updated_at, last_updated_by_type)
     VALUES ($1, $2, 'CONFIRMED', $3, $3, 'C3PAO')
     ON CONFLICT (engagement_id, item_type)
     DO UPDATE SET status = 'CONFIRMED', c3pao_confirmed_at = $3, last_updated_at = $3, last_updated_by_type = 'C3PAO'`,
    [engagementId, itemType, now]
  )
  return {
    itemType,
    status: 'CONFIRMED',
    customerNote: null,
    evidenceUrl: null,
    c3paoConfirmedAt: now,
    lastUpdatedAt: now,
    lastUpdatedByType: 'C3PAO',
  }
}
