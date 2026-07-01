/**
 * Local (air-gapped) collaboration data — Task 17: notes, check-ins, engagement comments.
 *
 * These are C3PAO-org-local (authored by the assessor in this container), so they live in local
 * tables — NOT the imported `imp_*` snapshot. Engagement comments additionally merge any imported
 * OSC comments (`imp_engagement_comment`) with locally-authored ones. No network.
 */
import { randomUUID } from 'node:crypto'
import { query } from '@/lib/db'
import type { NoteView, CheckinView, EngagementCommentItem } from '@/lib/api-client'

/** DDL for the local collaboration tables. Idempotent. Hooked into ensureSchema. */
export const COLLAB_SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS local_engagement_notes (
    id            TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    content       TEXT NOT NULL,
    author_id     TEXT,
    author_name   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_local_notes_engagement ON local_engagement_notes (engagement_id);

  CREATE TABLE IF NOT EXISTS local_engagement_checkins (
    id            TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT,
    author_name   TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_local_checkins_engagement ON local_engagement_checkins (engagement_id);

  CREATE TABLE IF NOT EXISTS local_engagement_comments (
    id            TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL,
    c3pao_id      TEXT NOT NULL DEFAULT '',
    author_id     TEXT,
    author_name   TEXT,
    content       TEXT NOT NULL,
    mentions      JSONB NOT NULL DEFAULT '[]',
    parent_id     TEXT,
    visibility    TEXT NOT NULL DEFAULT 'INTERNAL',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_local_comments_engagement ON local_engagement_comments (engagement_id);`

interface Queryable {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
}

/** Create the local collaboration tables. */
export async function ensureCollabSchema(pool: Queryable): Promise<void> {
  await pool.query(COLLAB_SCHEMA_DDL)
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ''))

// ---- Notes ----

export async function getLocalNotes(engagementId: string): Promise<NoteView[]> {
  const result = await query(
    `SELECT id, engagement_id, content, author_id, author_name, created_at
       FROM local_engagement_notes WHERE engagement_id = $1 ORDER BY created_at DESC`,
    [engagementId]
  )
  return result.rows.map((r) => ({
    id: String(r.id),
    engagementId: String(r.engagement_id),
    content: String(r.content),
    authorId: String(r.author_id ?? ''),
    authorName: r.author_name != null ? String(r.author_name) : null,
    createdAt: iso(r.created_at),
  }))
}

export async function createLocalNote(
  engagementId: string,
  content: string,
  author: { id: string; name: string }
): Promise<NoteView> {
  const id = `local-note-${randomUUID()}`
  await query(
    `INSERT INTO local_engagement_notes (id, engagement_id, content, author_id, author_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, engagementId, content, author.id, author.name]
  )
  return { id, engagementId, content, authorId: author.id, authorName: author.name, createdAt: new Date().toISOString() }
}

// ---- Check-ins ----

export async function getLocalCheckins(engagementId: string): Promise<CheckinView[]> {
  const result = await query(
    `SELECT id, title, description, author_name, created_at
       FROM local_engagement_checkins WHERE engagement_id = $1 ORDER BY created_at DESC`,
    [engagementId]
  )
  return result.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    description: r.description != null ? String(r.description) : null,
    authorName: String(r.author_name),
    createdAt: iso(r.created_at),
  }))
}

export async function createLocalCheckin(
  engagementId: string,
  input: { title: string; description?: string },
  authorName: string
): Promise<CheckinView> {
  const id = `local-checkin-${randomUUID()}`
  await query(
    `INSERT INTO local_engagement_checkins (id, engagement_id, title, description, author_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, engagementId, input.title, input.description ?? null, authorName]
  )
  return { id, title: input.title, description: input.description ?? null, authorName, createdAt: new Date().toISOString() }
}

// ---- Comments (imported OSC comments merged with local) ----

function mapLocalComment(r: Record<string, unknown>): EngagementCommentItem {
  return {
    id: String(r.id),
    engagementId: String(r.engagement_id),
    c3paoId: String(r.c3pao_id ?? ''),
    authorId: r.author_id != null ? String(r.author_id) : null,
    authorName: r.author_name != null ? String(r.author_name) : null,
    content: String(r.content),
    mentions: Array.isArray(r.mentions) ? (r.mentions as string[]) : [],
    parentId: r.parent_id != null ? String(r.parent_id) : null,
    visibility: (r.visibility as EngagementCommentItem['visibility']) ?? 'INTERNAL',
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  }
}

export async function getLocalComments(engagementId: string): Promise<EngagementCommentItem[]> {
  const [imported, local] = await Promise.all([
    query(`SELECT data FROM imp_engagement_comment WHERE engagement_id = $1`, [engagementId]),
    query(`SELECT * FROM local_engagement_comments WHERE engagement_id = $1`, [engagementId]),
  ])
  const fromImported = imported.rows.map(
    (r) => (r as { data: Record<string, unknown> }).data as unknown as EngagementCommentItem
  )
  const fromLocal = local.rows.map(mapLocalComment)
  return [...fromImported, ...fromLocal].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function createLocalComment(
  engagementId: string,
  input: { content: string; mentions?: string[]; parentId?: string | null; visibility?: EngagementCommentItem['visibility'] },
  author: { c3paoId: string; id: string; name: string }
): Promise<EngagementCommentItem> {
  const id = `local-comment-${randomUUID()}`
  const now = new Date().toISOString()
  const mentions = input.mentions ?? []
  const visibility = input.visibility ?? 'INTERNAL'
  await query(
    `INSERT INTO local_engagement_comments
       (id, engagement_id, c3pao_id, author_id, author_name, content, mentions, parent_id, visibility)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
    [id, engagementId, author.c3paoId, author.id, author.name, input.content, JSON.stringify(mentions), input.parentId ?? null, visibility]
  )
  return {
    id, engagementId, c3paoId: author.c3paoId, authorId: author.id, authorName: author.name,
    content: input.content, mentions, parentId: input.parentId ?? null, visibility, createdAt: now, updatedAt: now,
  }
}
