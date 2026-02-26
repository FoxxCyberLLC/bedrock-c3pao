'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Send, Loader2, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createAssessmentCheckin, getAssessmentCheckins } from '@/app/actions/c3pao-dashboard'
import { toast } from 'sonner'

interface CheckinCardProps {
  engagementId: string
  assessmentModeActive: boolean
}

interface Checkin {
  id: string
  title: string
  description?: string | null
  authorName: string
  createdAt: string
}

export function CheckinCard({ engagementId, assessmentModeActive }: CheckinCardProps) {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const loadCheckins = useCallback(async () => {
    const result = await getAssessmentCheckins(engagementId)
    if (result.success && result.data) {
      setCheckins(result.data)
    }
    setLoading(false)
  }, [engagementId])

  useEffect(() => {
    loadCheckins()
  }, [loadCheckins])

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    const result = await createAssessmentCheckin(
      engagementId,
      title.trim(),
      description.trim() || undefined
    )
    if (result.success) {
      toast.success('Check-in posted — customer can now see this update')
      setTitle('')
      setDescription('')
      loadCheckins()
    } else {
      toast.error(result.error || 'Failed to create check-in')
    }
    setSubmitting(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Customer Check-ins
            </CardTitle>
            <CardDescription>
              Post status updates visible to the customer
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">
            <Eye className="h-3 w-3 mr-1" />
            Visible to Customer
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {assessmentModeActive ? (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <Input
              placeholder="Check-in title (e.g., 'Day 2 Progress Update')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
            <Textarea
              placeholder="Optional details about assessment progress..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              size="sm"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Post Check-in
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Enable assessment mode to post check-in updates.
          </p>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading check-ins...</div>
        ) : checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No check-ins posted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">{checkin.title}</p>
                  {checkin.description && (
                    <p className="text-muted-foreground mt-0.5">{checkin.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {checkin.authorName} &middot; {formatDistanceToNow(new Date(checkin.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
