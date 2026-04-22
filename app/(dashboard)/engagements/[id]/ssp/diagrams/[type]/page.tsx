import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth'
import { getSSPBundleForC3PAO } from '@/app/actions/engagements'
import { DiagramReviewPage } from '@/components/c3pao/ssp/diagram-review-page'

type DiagramType = 'network' | 'dataflow'

interface PageProps {
  params: Promise<{ id: string; type: string }>
}

export default async function DiagramDetailPage({ params }: PageProps) {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const { id: engagementId, type } = await params
  if (type !== 'network' && type !== 'dataflow') notFound()
  const diagramType = type as DiagramType

  const result = await getSSPBundleForC3PAO(engagementId)
  if (!result.success || !result.data) notFound()

  const { ssp } = result.data
  const imageUrl = diagramType === 'network' ? ssp.networkDiagramUrl : ssp.dataFlowDiagramUrl
  const fileName =
    diagramType === 'network' ? ssp.networkDiagramFileName : ssp.dataFlowDiagramFileName
  const label = diagramType === 'network' ? 'Network Diagram' : 'Data Flow Diagram'

  return (
    <div className="container mx-auto py-6 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/engagements/${engagementId}/ssp`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to SSP
        </Link>
      </Button>

      <DiagramReviewPage
        engagementId={engagementId}
        diagramType={diagramType}
        label={label}
        imageUrl={imageUrl}
        fileName={fileName}
        lastModified={ssp.lastModified}
        currentUserId={session.c3paoUser.id}
      />
    </div>
  )
}
