'use client'

// H17: Dashboard-level error boundary — catches rendering errors in assessment routes.

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">
        An unexpected error occurred while loading this page.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
