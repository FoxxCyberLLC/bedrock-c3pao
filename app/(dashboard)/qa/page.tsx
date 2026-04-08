import { AlertTriangle, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QAQueueTable } from '@/components/c3pao/qa/qa-queue-table'
import { getQAReviews } from '@/app/actions/c3pao-qa'
import { requireAuth } from '@/lib/auth'

export const metadata = {
  title: 'QA Queue · Bedrock C3PAO',
  description: 'Pre-assessment form and final report QA reviews per CAP v2.0',
}

export default async function QAQueuePage() {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const [allResult, mineResult] = await Promise.all([
    getQAReviews(false),
    getQAReviews(true),
  ])

  const allReviews = allResult.success && allResult.data ? allResult.data : []
  const myReviews = mineResult.success && mineResult.data ? mineResult.data : []
  const apiError =
    !allResult.success || !mineResult.success
      ? allResult.error || mineResult.error
      : null

  const isLead = session.c3paoUser.isLeadAssessor

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <CheckSquare className="h-6 w-6 text-muted-foreground" />
          QA Queue
        </h1>
        <p className="text-muted-foreground">
          CAP v2.0 Phase 1 pre-assessment form + Phase 3 final report QA
          reviews · independent reviewer required
        </p>
      </div>

      {apiError && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-orange-900 dark:text-orange-100">
                Unable to load QA reviews
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

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">
            My Reviews ({myReviews.length})
          </TabsTrigger>
          {isLead && (
            <TabsTrigger value="all">
              All Open Reviews ({allReviews.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Reviews assigned to you
              </CardTitle>
              <CardDescription>
                Independent reviews — you are not on the engagement&apos;s
                assessment team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QAQueueTable initialReviews={myReviews} />
            </CardContent>
          </Card>
        </TabsContent>

        {isLead && (
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  All QA reviews across the C3PAO
                </CardTitle>
                <CardDescription>
                  Lead view · oversight of every open review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QAQueueTable initialReviews={allReviews} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
