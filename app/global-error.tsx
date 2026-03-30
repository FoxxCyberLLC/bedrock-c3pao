'use client'

// H17: Global error boundary — catches errors in the root layout.
// Must include <html> and <body> per Next.js App Router requirements.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>An unexpected error occurred. Please try again.</p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '1rem' }}>Error ID: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#2b6cb0', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
