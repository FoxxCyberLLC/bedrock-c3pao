/**
 * Local-filesystem evidence storage — the default (air-gapped) backend. Objects live under a
 * base directory (`EVIDENCE_DIR`), one file per key. Keys are confined to the base directory;
 * traversal attempts are rejected.
 */

import { createReadStream } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  StorageInvalidKeyError,
  StorageNotFoundError,
  type Storage,
  type StorageObjectStream,
} from './storage'

export class FsStorage implements Storage {
  private readonly baseDir: string

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir)
  }

  /** Resolve a key to an absolute path inside the base dir, rejecting traversal/absolute keys. */
  private resolvePath(key: string): string {
    if (key.includes('\0') || path.isAbsolute(key)) {
      throw new StorageInvalidKeyError(key)
    }
    const normalized = path.posix.normalize(key)
    if (normalized.startsWith('..') || normalized === '.') {
      throw new StorageInvalidKeyError(key)
    }
    const abs = path.resolve(this.baseDir, normalized)
    if (abs !== this.baseDir && !abs.startsWith(this.baseDir + path.sep)) {
      throw new StorageInvalidKeyError(key)
    }
    return abs
  }

  async put(key: string, body: Buffer): Promise<void> {
    const abs = this.resolvePath(key)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, body)
  }

  async get(key: string): Promise<Buffer> {
    const abs = this.resolvePath(key)
    try {
      return await readFile(abs)
    } catch (err) {
      if (isENOENT(err)) throw new StorageNotFoundError(key)
      throw err
    }
  }

  async getStream(key: string): Promise<StorageObjectStream> {
    const abs = this.resolvePath(key)
    let sizeBytes: number
    try {
      sizeBytes = (await stat(abs)).size
    } catch (err) {
      if (isENOENT(err)) throw new StorageNotFoundError(key)
      throw err
    }
    return { stream: createReadStream(abs), sizeBytes }
  }

  async delete(key: string): Promise<void> {
    const abs = this.resolvePath(key)
    await rm(abs, { force: true })
  }

  async exists(key: string): Promise<boolean> {
    const abs = this.resolvePath(key)
    try {
      await stat(abs)
      return true
    } catch (err) {
      if (isENOENT(err)) return false
      throw err
    }
  }
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT'
}
