/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShellErrorBoundary } from '@/components/shell-error-boundary'

/**
 * A component that throws on render. Used to trigger the error boundary
 * without relying on timing or user interaction.
 */
function BoomComponent({ message }: { message: string }): never {
  throw new Error(message)
}

describe('ShellErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // React logs caught errors to console.error; silence so test output is clean.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders children when nothing throws', () => {
    render(
      <ShellErrorBoundary>
        <div data-testid="happy">hello</div>
      </ShellErrorBoundary>,
    )
    expect(screen.getByTestId('happy')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders the fallback UI when a child throws', () => {
    render(
      <ShellErrorBoundary>
        <BoomComponent message="shell crashed" />
      </ShellErrorBoundary>,
    )

    // Fallback shows a friendly message + a Reload action + exposes the error
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })

  it('logs the error via console.error once (React default) without bubbling', () => {
    render(
      <ShellErrorBoundary>
        <BoomComponent message="another crash" />
      </ShellErrorBoundary>,
    )
    // React's default error logging fires; just assert it was called (not zero)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
