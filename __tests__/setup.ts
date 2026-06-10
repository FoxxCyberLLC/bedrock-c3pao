import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Deterministic 32-byte key so config-encryption code paths (lib/crypto,
// lib/config) don't throw on a missing CONFIG_ENCRYPTION_KEY during the run.
// Not a real secret — fixed bytes are fine for tests.
if (!process.env.CONFIG_ENCRYPTION_KEY) {
  process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
}

// Global teardown after every React component test so the DOM is clean for the next.
afterEach(() => {
  cleanup()
})
