/**
 * Selects the evidence storage backend from the environment. Today only the local
 * filesystem backend exists (air-gapped default); cloud backends (S3 / Azure Blob) slot in
 * here behind the same `Storage` interface for partner deployments.
 */

import { FsStorage } from './fs-storage'
import type { Storage } from './storage'

export interface StorageEnv {
  /** Base directory for local evidence storage. Defaults to `./data/evidence`. */
  EVIDENCE_DIR?: string
}

const DEFAULT_EVIDENCE_DIR = './data/evidence'

export function createStorage(env: StorageEnv = process.env as StorageEnv): Storage {
  const dir = env.EVIDENCE_DIR?.trim() ? env.EVIDENCE_DIR : DEFAULT_EVIDENCE_DIR
  return new FsStorage(dir)
}
