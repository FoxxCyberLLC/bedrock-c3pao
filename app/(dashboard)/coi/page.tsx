import { AlertTriangle, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { COIRegisterTable } from '@/components/c3pao/coi/coi-register-table'
import { getCOIList } from '@/app/actions/c3pao-coi'
import { requireAuth } from '@/lib/auth'

export const metadata = {
  title: 'COI Register · Bedrock C3PAO',
  description: 'Conflicts of Interest disclosures per CAP v2.0 Preliminary Proceedings',
}

export default async function COIRegisterPage() {
  const session = await requireAuth()
  if (!session) redirect('/login')

  // Lead-only page
  if (!session.c3paoUser.isLeadAssessor) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
        <CardContent className="flex items-start gap-3 py-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Lead assessors only
            </p>
            <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
              The Conflicts of Interest register is restricted to lead assessors.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const result = await getCOIList()
  const disclosures = result.success && result.data ? result.data : []
  const apiError = !result.success ? result.error : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          Conflicts of Interest
        </h1>
        <p className="text-muted-foreground">
          CAP v2.0 Preliminary Proceedings register. Disclosures block team
          assignment when active.
        </p>
      </div>

      {apiError && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-orange-900 dark:text-orange-100">
                Unable to load disclosures
              </p>
              <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-300">
                {apiError}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/connection">Check Connection</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Register</CardTitle>
          <CardDescription>
            {disclosures.length} {disclosures.length === 1 ? 'disclosure' : 'disclosures'} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <COIRegisterTable initialDisclosures={disclosures} />
        </CardContent>
      </Card>
    </div>
  )
}
