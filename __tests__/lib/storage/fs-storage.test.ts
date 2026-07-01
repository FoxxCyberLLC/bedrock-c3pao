import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FsStorage } from '@/lib/storage/fs-storage'
import { StorageNotFoundError, StorageInvalidKeyError } from '@/lib/storage/storage'
import { createStorage } from '@/lib/storage/factory'

describe('FsStorage', () => {
  let dir: string
  let storage: FsStorage

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'c3pao-storage-'))
    storage = new FsStorage(dir)
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('round-trips bytes through put then get', async () => {
    const key = 'evidence/e1/report.pdf'
    const body = Buffer.from('hello evidence')
    await storage.put(key, body)
    expect(await storage.get(key)).toEqual(body)
  })

  it('streams an object with its byte size', async () => {
    const key = 'evidence/e2/big.bin'
    const body = Buffer.alloc(1024, 9)
    await storage.put(key, body)
    const { stream, sizeBytes } = await storage.getStream(key)
    expect(sizeBytes).toBe(1024)
    const chunks: Buffer[] = []
    for await (const c of stream) chunks.push(c as Buffer)
    expect(Buffer.concat(chunks)).toEqual(body)
  })

  it('reports existence', async () => {
    await storage.put('evidence/e3/x', Buffer.from('x'))
    expect(await storage.exists('evidence/e3/x')).toBe(true)
    expect(await storage.exists('evidence/missing')).toBe(false)
  })

  it('throws StorageNotFoundError for a missing key', async () => {
    await expect(storage.get('evidence/nope')).rejects.toBeInstanceOf(StorageNotFoundError)
  })

  it('deletes an object (and is a no-op when absent)', async () => {
    await storage.put('evidence/e4/y', Buffer.from('y'))
    await storage.delete('evidence/e4/y')
    expect(await storage.exists('evidence/e4/y')).toBe(false)
    await expect(storage.delete('evidence/e4/y')).resolves.toBeUndefined()
  })

  it('rejects keys that escape the storage root (path traversal)', async () => {
    await expect(storage.put('../escape', Buffer.from('x'))).rejects.toBeInstanceOf(
      StorageInvalidKeyError,
    )
    await expect(storage.get('evidence/../../etc/passwd')).rejects.toBeInstanceOf(
      StorageInvalidKeyError,
    )
  })
})

describe('createStorage factory', () => {
  it('returns a filesystem storage when no cloud backend is configured', () => {
    const s = createStorage({ EVIDENCE_DIR: join(tmpdir(), 'c3pao-evidence') })
    expect(s).toBeInstanceOf(FsStorage)
  })
})
