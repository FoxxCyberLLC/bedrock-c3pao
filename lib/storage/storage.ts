/**
 * Pluggable evidence storage abstraction. Mirrors the Go `pkg/s3.Storage` interface so the
 * offline (local filesystem) and future cloud (S3 / Azure Blob) backends are interchangeable.
 * Keys are POSIX-style paths, e.g. `evidence/<evidenceId>/<filename>`.
 */

import type { Readable } from 'node:stream'

/** Thrown by `get`/`getStream`/`delete` when the key does not exist. */
export class StorageNotFoundError extends Error {
  constructor(key: string) {
    super(`storage: object not found: ${key}`)
    this.name = 'StorageNotFoundError'
  }
}

/** Thrown when a key escapes the storage root (path traversal) or is otherwise invalid. */
export class StorageInvalidKeyError extends Error {
  constructor(key: string) {
    super(`storage: invalid key: ${key}`)
    this.name = 'StorageInvalidKeyError'
  }
}

/** A readable stream plus the object's size, for streaming large evidence without buffering. */
export interface StorageObjectStream {
  stream: Readable
  sizeBytes: number
}

/** Backend-agnostic evidence store. */
export interface Storage {
  /** Write bytes at `key`, creating intermediate directories/prefixes as needed. */
  put(key: string, body: Buffer, contentType?: string): Promise<void>
  /** Read the full object. Throws `StorageNotFoundError` if absent. */
  get(key: string): Promise<Buffer>
  /** Open the object for streaming. Throws `StorageNotFoundError` if absent. */
  getStream(key: string): Promise<StorageObjectStream>
  /** Remove the object. No-op if absent. */
  delete(key: string): Promise<void>
  /** True if the object exists. */
  exists(key: string): Promise<boolean>
}
