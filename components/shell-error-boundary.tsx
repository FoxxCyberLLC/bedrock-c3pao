'use client'

import React from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

/**
 * Error boundary wrapping the AppSidebar + AppHeader shell.
 *
 * Protects users from being locked out of the dashboard when a shell
 * sub-component throws — a browser extension blocking storage, a command
 * palette fetch failure, a notifications poll crash, or a localStorage
 * hydration mismatch can all throw during render and propagate past the
 * route-level `app/(dashboard)/error.tsx` boundary.
 *
 * Fallback UI is intentionally minimal: a centered message + a Reload
 * button. Keeps the dependency surface tiny so the fallback itself cannot
 * fail for the same reason the primary shell did.
 */

interface ShellErrorBoundaryProps {
  children: React.ReactNode
}

interface ShellErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ShellErrorBoundary extends React.Component<
  ShellErrorBoundaryProps,
  ShellErrorBoundaryState
> {
  constructor(props: ShellErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ShellErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Log to console for dev diagnostics. Production logging hookups are
    // handled by the global error boundary layer.
    console.error('Shell error boundary caught:', error, info)
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The application shell crashed. Your data is safe — this is a UI-only
              error. Reload the page to recover.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-muted-foreground bg-muted rounded-md p-3 overflow-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
