import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import C3PAOLoginForm from '@/components/c3pao-login-form'
import { Building2, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function C3PAOLoginPage() {
  // Use requireC3PAOAuth to verify user is still active, not just cookie exists
  const user = await requireAuth()
  if (user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">C3PAO Portal</CardTitle>
          <CardDescription>
            Sign in to access your assessment engagements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <C3PAOLoginForm />

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center mb-4">
              This portal is for certified C3PAO assessors only.
              Access is logged and monitored.
            </p>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors group"
            >
              <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              <span className="text-sm text-muted-foreground group-hover:text-primary">
                Customer Login
              </span>
            </Link>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Looking for your CMMC compliance dashboard?
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
