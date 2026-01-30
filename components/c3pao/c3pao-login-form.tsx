'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { c3paoLogin } from '@/app/actions/c3pao-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function C3PAOLoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await c3paoLogin(formData)

      if (!result.success) {
        setError(result.error || 'Login failed')
        setIsLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          name="email"
          required
          placeholder="assessor@c3pao.com"
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password?type=C3PAO_USER"
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          type="password"
          id="password"
          name="password"
          required
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  )
}
