/**
 * Runtime mode detection for the air-gapped build. When `OFFLINE=true`, the app serves
 * entirely from local PostgreSQL + local storage and must never reach the remote Bedrock API.
 * `assertOnline` guards the api-client so any un-migrated code path fails loudly (a thrown
 * `OfflineModeError` in tests) instead of silently attempting a network call.
 */

/** Thrown when a remote Bedrock API call is attempted while running offline. */
export class OfflineModeError extends Error {
  constructor(context: string) {
    super(`offline mode: remote API call is not available (${context})`)
    this.name = 'OfflineModeError'
  }
}

/** True when the container is configured for air-gapped operation (`OFFLINE=true`). */
export function isOffline(env: Record<string, string | undefined> = process.env): boolean {
  return env.OFFLINE === 'true'
}

/** Throw if a remote API call is attempted while offline. No-op when online. */
export function assertOnline(context: string): void {
  if (isOffline()) throw new OfflineModeError(context)
}
