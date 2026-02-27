'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ClipboardList, Save, Users, Calendar, Loader2 } from 'lucide-react'
import { getAssessmentPlanning, updateAssessmentPlanning } from '@/app/actions/c3pao-assessment'
import { getEngagementTeam, assignControlsToAssessor } from '@/app/actions/c3pao-team-assignment'

// ---- Types ----

interface PlanningData {
  engagementId?: string
  assessmentMethodology: string | null
  planningNotes: string | null
  assessmentTimeline: string | null
  assessmentScope: string | null
  scheduledStartDate: string | null
  scheduledEndDate: string | null
}

interface TeamMember {
  id: string
  assessorId: string
  name: string
  email: string
  role: string
  assessorType: string
  jobTitle?: string | null
  assignedAt: string
  domains: string[]
}

interface AssessmentPlanningBoardProps {
  engagementId: string
  isLeadAssessor: boolean
}

// ---- NIST 800-171 Families ----

const NIST_FAMILIES: { code: string; label: string }[] = [
  { code: 'AC', label: 'Access Control' },
  { code: 'AT', label: 'Awareness and Training' },
  { code: 'AU', label: 'Audit and Accountability' },
  { code: 'CM', label: 'Configuration Management' },
  { code: 'IA', label: 'Identification and Authentication' },
  { code: 'IR', label: 'Incident Response' },
  { code: 'MA', label: 'Maintenance' },
  { code: 'MP', label: 'Media Protection' },
  { code: 'PS', label: 'Personnel Security' },
  { code: 'PE', label: 'Physical Protection' },
  { code: 'RA', label: 'Risk Assessment' },
  { code: 'CA', label: 'Security Assessment' },
  { code: 'SC', label: 'System and Communications Protection' },
  { code: 'SI', label: 'System and Information Integrity' },
]

// ---- Component ----

export function AssessmentPlanningBoard({ engagementId, isLeadAssessor }: AssessmentPlanningBoardProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigningFamily, setAssigningFamily] = useState<string | null>(null)

  // Planning form state
  const [methodology, setMethodology] = useState('')
  const [scope, setScope] = useState('')
  const [timeline, setTimeline] = useState('')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Team data
  const [team, setTeam] = useState<TeamMember[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [planningResult, teamResult] = await Promise.all([
        getAssessmentPlanning(engagementId),
        getEngagementTeam(engagementId),
      ])

      if (planningResult.success && planningResult.data) {
        const d = planningResult.data
        setMethodology(d.assessmentMethodology ?? '')
        setScope(d.assessmentScope ?? '')
        setTimeline(d.assessmentTimeline ?? '')
        setNotes(d.planningNotes ?? '')
        setStartDate(d.scheduledStartDate ?? '')
        setEndDate(d.scheduledEndDate ?? '')
      }

      if (teamResult.success && teamResult.data) {
        setTeam(teamResult.data as TeamMember[])
      }
    } catch {
      toast.error('Failed to load planning data')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSavePlanning() {
    setSaving(true)
    try {
      const result = await updateAssessmentPlanning(engagementId, {
        assessmentMethodology: methodology || null,
        assessmentScope: scope || null,
        assessmentTimeline: timeline || null,
        planningNotes: notes || null,
        scheduledStartDate: startDate || null,
        scheduledEndDate: endDate || null,
      })

      if (result.success) {
        toast.success('Planning details saved')
      } else {
        toast.error(result.error || 'Failed to save planning details')
      }
    } catch {
      toast.error('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  async function handleAssignFamily(familyCode: string, assessorId: string) {
    if (!assessorId) return

    setAssigningFamily(familyCode)
    try {
      // Find the assessor and build the new domains array
      const assessor = team.find((m) => m.assessorId === assessorId)
      if (!assessor) return

      const updatedDomains = assessor.domains.includes(familyCode)
        ? assessor.domains
        : [...assessor.domains, familyCode]

      const result = await assignControlsToAssessor(engagementId, assessorId, updatedDomains)

      if (result.success) {
        // Update local state to reflect the change
        setTeam((prev) =>
          prev.map((m) =>
            m.assessorId === assessorId
              ? { ...m, domains: updatedDomains }
              : m
          )
        )
        toast.success(`Assigned ${familyCode} to ${assessor.name}`)
      } else {
        toast.error(result.error || 'Failed to assign domain')
      }
    } catch {
      toast.error('An error occurred while assigning domain')
    } finally {
      setAssigningFamily(null)
    }
  }

  async function handleUnassignFamily(familyCode: string, assessorId: string) {
    setAssigningFamily(familyCode)
    try {
      const assessor = team.find((m) => m.assessorId === assessorId)
      if (!assessor) return

      const updatedDomains = assessor.domains.filter((d) => d !== familyCode)

      const result = await assignControlsToAssessor(engagementId, assessorId, updatedDomains)

      if (result.success) {
        setTeam((prev) =>
          prev.map((m) =>
            m.assessorId === assessorId
              ? { ...m, domains: updatedDomains }
              : m
          )
        )
        toast.success(`Unassigned ${familyCode} from ${assessor.name}`)
      } else {
        toast.error(result.error || 'Failed to unassign domain')
      }
    } catch {
      toast.error('An error occurred while unassigning domain')
    } finally {
      setAssigningFamily(null)
    }
  }

  // Get all assessors assigned to a specific family
  function getAssessorsForFamily(familyCode: string): TeamMember[] {
    return team.filter((m) => m.domains.includes(familyCode))
  }

  // Get assessors who are NOT yet assigned to a specific family (for the dropdown)
  function getUnassignedAssessors(familyCode: string): TeamMember[] {
    return team.filter(
      (m) => !m.domains.includes(familyCode) && (m.role === 'ASSESSOR' || m.role === 'LEAD' || m.role === 'LEAD_ASSESSOR')
    )
  }

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---- Planning Details Card ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Planning Details
          </CardTitle>
          <CardDescription>
            Define the assessment methodology, scope, timeline, and other planning information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="methodology">Assessment Methodology</Label>
            {isLeadAssessor ? (
              <Textarea
                id="methodology"
                placeholder="Describe the assessment methodology..."
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                className="min-h-24"
              />
            ) : (
              <div className="rounded-md border p-3 text-sm text-muted-foreground bg-muted/30 min-h-16">
                {methodology || 'Not specified'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Assessment Scope</Label>
            {isLeadAssessor ? (
              <Textarea
                id="scope"
                placeholder="Define the assessment scope..."
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="min-h-24"
              />
            ) : (
              <div className="rounded-md border p-3 text-sm text-muted-foreground bg-muted/30 min-h-16">
                {scope || 'Not specified'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline">Assessment Timeline</Label>
            {isLeadAssessor ? (
              <Textarea
                id="timeline"
                placeholder="Outline the assessment timeline..."
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="min-h-24"
              />
            ) : (
              <div className="rounded-md border p-3 text-sm text-muted-foreground bg-muted/30 min-h-16">
                {timeline || 'Not specified'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Planning Notes</Label>
            {isLeadAssessor ? (
              <Textarea
                id="notes"
                placeholder="Additional planning notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24"
              />
            ) : (
              <div className="rounded-md border p-3 text-sm text-muted-foreground bg-muted/30 min-h-16">
                {notes || 'Not specified'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Scheduled Start Date
              </Label>
              {isLeadAssessor ? (
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              ) : (
                <div className="rounded-md border p-2 text-sm text-muted-foreground bg-muted/30 h-9 flex items-center">
                  {startDate || 'Not set'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Scheduled End Date
              </Label>
              {isLeadAssessor ? (
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              ) : (
                <div className="rounded-md border p-2 text-sm text-muted-foreground bg-muted/30 h-9 flex items-center">
                  {endDate || 'Not set'}
                </div>
              )}
            </div>
          </div>

          {isLeadAssessor && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePlanning} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Planning Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Domain Assignment Card ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Domain Assignments
          </CardTitle>
          <CardDescription>
            Assign NIST 800-171 control families to assessment team members. Each family can have one or more assessors responsible for evaluating its controls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Table header */}
            <div className="grid grid-cols-[200px_1fr_200px] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
              <div>Family</div>
              <div>Assigned Assessors</div>
              {isLeadAssessor && <div>Assign</div>}
            </div>

            {/* Family rows */}
            {NIST_FAMILIES.map((family) => {
              const assigned = getAssessorsForFamily(family.code)
              const available = getUnassignedAssessors(family.code)
              const isAssigning = assigningFamily === family.code

              return (
                <div
                  key={family.code}
                  className="grid grid-cols-[200px_1fr_200px] gap-4 items-center px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                >
                  {/* Family code and label */}
                  <div className="text-sm">
                    <span className="font-mono font-medium text-foreground">{family.code}</span>
                    <span className="text-muted-foreground ml-1.5">- {family.label}</span>
                  </div>

                  {/* Assigned assessors as badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {assigned.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    ) : (
                      assigned.map((assessor) => (
                        <Badge
                          key={assessor.assessorId}
                          variant="secondary"
                          className="text-xs cursor-default group"
                        >
                          {assessor.name}
                          {isLeadAssessor && (
                            <button
                              type="button"
                              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => handleUnassignFamily(family.code, assessor.assessorId)}
                              disabled={isAssigning}
                              aria-label={`Remove ${assessor.name} from ${family.label}`}
                            >
                              &times;
                            </button>
                          )}
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Assign dropdown (lead only) */}
                  {isLeadAssessor && (
                    <div>
                      {isAssigning ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Assigning...
                        </div>
                      ) : available.length > 0 ? (
                        <Select
                          onValueChange={(assessorId) => handleAssignFamily(family.code, assessorId)}
                        >
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="Assign assessor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {available.map((assessor) => (
                              <SelectItem key={assessor.assessorId} value={assessor.assessorId}>
                                {assessor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">All assigned</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {team.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No team members available for assignment.</p>
              <p className="text-xs mt-1">Add team members to the engagement first.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
