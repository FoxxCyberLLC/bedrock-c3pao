'use server'

import { requireAuth } from '@/lib/auth'
import { ensureSchema } from '@/lib/db'
import { createStorage } from '@/lib/storage/factory'
import {
  importSnapshot,
  SnapshotFormatError,
  SnapshotIntegrityError,
  type ImportResult,
} from '@/lib/import/import-snapshot'

/** Matches the Server Actions body limit (next.config `bodySizeLimit`). */
const MAX_SNAPSHOT_BYTES = 50 * 1024 * 1024

export interface ImportActionResult {
  success: boolean
  data?: ImportResult
  error?: string
}

/**
 * Import an OSC assessment snapshot package (`v1` zip) uploaded by an assessor. Validates,
 * loads into local Postgres + evidence Storage, and returns per-table counts. Format/integrity
 * failures surface as user-facing errors; unexpected failures are logged and masked.
 */
export async function importSnapshotAction(formData: FormData): Promise<ImportActionResult> {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { success: false, error: 'A snapshot .zip file is required' }
  if (file.size === 0) return { success: false, error: 'The snapshot file is empty' }
  if (file.size > MAX_SNAPSHOT_BYTES) {
    return { success: false, error: `Snapshot exceeds the ${MAX_SNAPSHOT_BYTES / (1024 * 1024)} MB limit` }
  }

  try {
    await ensureSchema()
    const bytes = Buffer.from(await file.arrayBuffer())
    const result = await importSnapshot(bytes, { storage: createStorage() })
    return { success: true, data: result }
  } catch (err) {
    if (err instanceof SnapshotFormatError || err instanceof SnapshotIntegrityError) {
      return { success: false, error: err.message }
    }
    console.error('snapshot import failed', err)
    return { success: false, error: 'Import failed. Check the package and try again.' }
  }
}
