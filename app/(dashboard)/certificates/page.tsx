import { AlertTriangle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CertificateTracker } from '@/components/c3pao/certificates/certificate-tracker'
import { getPortfolioList } from '@/app/actions/c3pao-portfolio'
import { requireAuth } from '@/lib/auth'

export const metadata = {
  title: 'Certificates · Bedrock C3PAO',
  description: 'Issued CMMC Level 2 certificates, expiry tracker, and POA&M closeouts',
}

export default async function CertificatesPage() {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const result = await getPortfolioList()
  const items = result.success && result.data ? result.data : []
  const apiError = !result.success ? result.error : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          Certificates
        </h1>
        <p className="text-muted-foreground">
          CAP v2.0 Phase 4 certificate tracker · Final Level 2 expiry,
          Conditional POA&M closeout deadlines, and historical record.
        </p>
      </div>

      {apiError && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-orange-900 dark:text-orange-100">
                Unable to load certificates
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

      <CertificateTracker items={items} />
    </div>
  )
}
