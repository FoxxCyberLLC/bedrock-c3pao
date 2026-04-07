import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global teardown after every React component test so the DOM is clean for the next.
afterEach(() => {
  cleanup()
})
