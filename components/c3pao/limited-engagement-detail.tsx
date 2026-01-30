'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Building2,
  Shield,
  MessageSquare,
  Loader2,
  Calendar,
  Send,
  CheckCircle2,
  Lock,
  FileText,
  Package,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { acknowledgeIntroduction, sendProposal, declineIntroduction } from '@/app/actions/c3pao-dashboard'
import { toast } from 'sonner'

interface LimitedEngagementDetailProps {
  engagement: {
    id: string
    status: string
    targetLevel: string
    introductionMessage?: string | null
    introducedAt?: Date | null
    acknowledgedAt?: Date | null
    proposalMessage?: string | null
    proposalScope?: string | null
    proposalTimeline?: string | null
    proposalTerms?: string | null
    proposalValidUntil?: Date | null
    proposalSentAt?: Date | null
    quotedPrice?: number | null
    createdAt: Date
    atoPackage: {
      id: string
      name: string
      cmmcLevel: string
      organization?: {
        id: string
        name: string
        industry?: string | null
      } | null
      _count?: {
        requirementStatuses: number
        assets: number
        evidence: number
        poams: number
        externalServiceProviders: number
      }
    } | null
  }
  user: {
    id: string
    name: string
    email: string
    isLeadAssessor: boolean
  }
}

export function LimitedEngagementDetail({ engagement, user }: LimitedEngagementDetailProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showProposalDialog, setShowProposalDialog] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  // Proposal form state
  const [proposalMessage, setProposalMessage] = useState('')
  const [proposalScope, setProposalScope] = useState('')
  const [proposalTimeline, setProposalTimeline] = useState('')
  const [proposalPrice, setProposalPrice] = useState('')
  const [proposalTerms, setProposalTerms] = useState('')

  const pkg = engagement.atoPackage

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INTRODUCED':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">New Introduction</Badge>
      case 'ACKNOWLEDGED':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">Acknowledged</Badge>
      case 'PROPOSAL_SENT':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Proposal Sent</Badge>
      case 'PROPOSAL_DECLINED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Proposal Declined</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAcknowledge = async () => {
    setIsUpdating(true)
    try {
      const result = await acknowledgeIntroduction(engagement.id)
      if (result.success) {
        toast.success('Introduction acknowledged')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to acknowledge')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendProposal = async () => {
    if (!proposalMessage || !proposalScope || !proposalTimeline || !proposalPrice) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsUpdating(true)
    try {
      const result = await sendProposal({
        engagementId: engagement.id,
        message: proposalMessage,
        scope: proposalScope,
        timeline: proposalTimeline,
        price: parseFloat(proposalPrice),
        terms: proposalTerms || undefined,
      })
      if (result.success) {
        toast.success('Proposal sent successfully')
        setShowProposalDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to send proposal')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDecline = async () => {
    setIsUpdating(true)
    try {
      const result = await declineIntroduction(engagement.id, declineReason)
      if (result.success) {
        toast.success('Introduction declined')
        setShowDeclineDialog(false)
        router.push('/engagements')
      } else {
        toast.error(result.error || 'Failed to decline')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/engagements">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Engagements
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{pkg?.organization?.name || 'Unknown Organization'}</h1>
            {getStatusBadge(engagement.status)}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>{pkg?.name || 'Unknown Package'}</span>
            </div>
            <Badge variant="outline">{engagement.targetLevel.replace('_', ' ')}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {engagement.status === 'INTRODUCED' && (
            <>
              <Button onClick={handleAcknowledge} disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Acknowledge
              </Button>
              <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">Decline</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Decline Introduction</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to decline this introduction?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label>Reason (optional)</Label>
                    <Textarea
                      placeholder="Enter a reason for declining..."
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDecline} disabled={isUpdating}>
                      {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Decline
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          {engagement.status === 'ACKNOWLEDGED' && (
            <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Assessment Proposal</DialogTitle>
                  <DialogDescription>
                    Send a formal proposal to {pkg?.organization?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Message *</Label>
                    <Textarea
                      placeholder="Enter your proposal message..."
                      value={proposalMessage}
                      onChange={(e) => setProposalMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Scope of Assessment *</Label>
                      <Textarea
                        placeholder="Define the assessment scope..."
                        value={proposalScope}
                        onChange={(e) => setProposalScope(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Timeline *</Label>
                      <Textarea
                        placeholder="Estimated timeline and milestones..."
                        value={proposalTimeline}
                        onChange={(e) => setProposalTimeline(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price (USD) *</Label>
                      <Input
                        type="number"
                        placeholder="Enter price..."
                        value={proposalPrice}
                        onChange={(e) => setProposalPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Terms & Conditions (optional)</Label>
                      <Input
                        placeholder="Any additional terms..."
                        value={proposalTerms}
                        onChange={(e) => setProposalTerms(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendProposal} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Proposal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Access Notice */}
      <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="flex items-start gap-4 pt-6">
          <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Limited Access</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              You are in the introduction phase. Full access to the ATO package will be granted once
              the customer accepts your proposal and the assessment begins. Currently, you can only
              view summary information about the organization.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Introduction Message */}
      {engagement.introductionMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Introduction Message
            </CardTitle>
            <CardDescription>
              Received on {engagement.introducedAt ? format(new Date(engagement.introducedAt), 'PPP') : 'Unknown'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{engagement.introductionMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposal Sent Info */}
      {engagement.status === 'PROPOSAL_SENT' && engagement.proposalMessage && (
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Proposal Sent
            </CardTitle>
            <CardDescription>
              Sent on {engagement.proposalSentAt ? format(new Date(engagement.proposalSentAt), 'PPP') : 'Unknown'}
              {engagement.proposalValidUntil && (
                <> | Valid until {format(new Date(engagement.proposalValidUntil), 'PPP')}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Message</Label>
              <p className="text-sm mt-1">{engagement.proposalMessage}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Scope</Label>
                <p className="text-sm mt-1">{engagement.proposalScope}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Timeline</Label>
                <p className="text-sm mt-1">{engagement.proposalTimeline}</p>
              </div>
            </div>
            {engagement.quotedPrice && (
              <div>
                <Label className="text-xs text-muted-foreground">Quoted Price</Label>
                <p className="text-lg font-semibold mt-1">${engagement.quotedPrice.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Organization Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <p className="font-medium">{pkg?.organization?.name || 'Unknown'}</p>
            </div>
            {pkg?.organization?.industry && (
              <div>
                <Label className="text-xs text-muted-foreground">Industry</Label>
                <p className="font-medium">{pkg.organization.industry}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Package Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Package Name</Label>
              <p className="font-medium">{pkg?.name || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CMMC Target Level</Label>
              <p className="font-medium">{pkg?.cmmcLevel?.replace('_', ' ') || engagement.targetLevel.replace('_', ' ')}</p>
            </div>
            {pkg?._count && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{pkg._count.requirementStatuses} Controls</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{pkg._count.assets} Assets</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{pkg._count.evidence} Evidence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{pkg._count.externalServiceProviders} Providers</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="font-medium">Introduction Received</span>
                <span className="text-muted-foreground">
                  {engagement.introducedAt ? format(new Date(engagement.introducedAt), 'PPP') : format(new Date(engagement.createdAt), 'PPP')}
                </span>
              </div>
            </div>
            {engagement.acknowledgedAt && (
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="font-medium">Acknowledged</span>
                  <span className="text-muted-foreground">
                    {format(new Date(engagement.acknowledgedAt), 'PPP')}
                  </span>
                </div>
              </div>
            )}
            {engagement.proposalSentAt && (
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-medium">Proposal Sent</span>
                  <span className="text-muted-foreground">
                    {format(new Date(engagement.proposalSentAt), 'PPP')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
