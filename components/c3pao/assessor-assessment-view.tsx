'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Minus,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AssessorControlCard } from './assessor-control-card'
import { getAssessmentFindings, getAssessmentStats } from '@/app/actions/c3pao-assessment'

type AssessorDetermination = 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'

interface RequirementFamily {
  id: string
  code: string
  name: string
}

interface Requirement {
  id: string
  requirementId: string
  title: string
  basicRequirement: string
  derivedRequirement: string | null
  discussion: string
  family: RequirementFamily
}

interface RequirementStatus {
  id: string
  status: string
  implementationNotes: string | null
  requirement: Requirement
}

interface AssessmentFinding {
  id: string
  requirementId: string
  determination: AssessorDetermination
  methodInterview: boolean
  methodExamine: boolean
  methodTest: boolean
  finding: string | null
  objectiveEvidence: string | null
  deficiency: string | null
  recommendation: string | null
  riskLevel: string | null
  assessedBy: { name: string } | null
  assessedAt: Date | null
}

interface AssessorAssessmentViewProps {
  engagementId: string
  requirementStatuses: RequirementStatus[]
  isAssessmentInProgress: boolean
}

const determinationColors: Record<string, { bg: string; text: string }> = {
  NOT_ASSESSED: { bg: 'bg-gray-500/10', text: 'text-gray-500' },
  MET: { bg: 'bg-green-500/10', text: 'text-green-600' },
  NOT_MET: { bg: 'bg-red-500/10', text: 'text-red-600' },
  NOT_APPLICABLE: { bg: 'bg-gray-400/10', text: 'text-gray-400' },
}

const familyColors: Record<string, string> = {
  AC: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  AT: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  AU: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  CM: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  IA: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  IR: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  MA: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  MP: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  PS: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  PE: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  RA: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SA: 'bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/20',
  SC: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  SI: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
}

export function AssessorAssessmentView({
  engagementId,
  requirementStatuses,
  isAssessmentInProgress,
}: AssessorAssessmentViewProps) {
  const [findings, setFindings] = useState<AssessmentFinding[]>([])
  const [stats, setStats] = useState<{
    total: number
    assessed: number
    met: number
    notMet: number
    notApplicable: number
    notAssessed: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [determinationFilter, setDeterminationFilter] = useState<string>('all')
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())

  // Load findings and stats
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const [findingsResult, statsResult] = await Promise.all([
        getAssessmentFindings(engagementId),
        getAssessmentStats(engagementId),
      ])

      if (findingsResult.success) {
        setFindings(findingsResult.data as AssessmentFinding[])
      }
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
      setIsLoading(false)
    }
    loadData()
  }, [engagementId])

  // Create a map of findings by requirement ID
  const findingsMap = useMemo(() => {
    const map = new Map<string, AssessmentFinding>()
    findings.forEach((f) => map.set(f.requirementId, f))
    return map
  }, [findings])

  // Group controls by family
  const groupedControls = useMemo(() => {
    const groups = new Map<string, { family: RequirementFamily; controls: RequirementStatus[] }>()

    requirementStatuses.forEach((rs) => {
      const familyCode = rs.requirement.family.code
      if (!groups.has(familyCode)) {
        groups.set(familyCode, {
          family: rs.requirement.family,
          controls: [],
        })
      }
      groups.get(familyCode)!.controls.push(rs)
    })

    return Array.from(groups.values()).sort((a, b) =>
      a.family.code.localeCompare(b.family.code)
    )
  }, [requirementStatuses])

  // Filter controls
  const filteredGroups = useMemo(() => {
    return groupedControls.map((group) => ({
      ...group,
      controls: group.controls.filter((rs) => {
        const finding = findingsMap.get(rs.requirement.id)
        const determination = finding?.determination || 'NOT_ASSESSED'

        const matchesSearch =
          rs.requirement.requirementId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rs.requirement.title.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesDetermination =
          determinationFilter === 'all' || determination === determinationFilter

        return matchesSearch && matchesDetermination
      }),
    })).filter((group) => group.controls.length > 0)
  }, [groupedControls, findingsMap, searchQuery, determinationFilter])

  // Calculate stats per family
  const getFamilyStats = useCallback((controls: RequirementStatus[]) => {
    const familyStats = { met: 0, notMet: 0, notApplicable: 0, notAssessed: 0 }
    controls.forEach((rs) => {
      const finding = findingsMap.get(rs.requirement.id)
      const determination = finding?.determination || 'NOT_ASSESSED'
      switch (determination) {
        case 'MET':
          familyStats.met++
          break
        case 'NOT_MET':
          familyStats.notMet++
          break
        case 'NOT_APPLICABLE':
          familyStats.notApplicable++
          break
        default:
          familyStats.notAssessed++
      }
    })
    return familyStats
  }, [findingsMap])

  // Toggle family expansion
  const toggleFamily = (familyCode: string) => {
    setExpandedFamilies((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(familyCode)) {
        newSet.delete(familyCode)
      } else {
        newSet.add(familyCode)
      }
      return newSet
    })
  }

  // Handle finding saved
  const handleFindingSaved = (requirementId: string, newFinding: AssessmentFinding) => {
    setFindings((prev) => {
      const existing = prev.findIndex((f) => f.requirementId === requirementId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newFinding
        return updated
      }
      return [...prev, newFinding]
    })
    // Refresh stats
    getAssessmentStats(engagementId).then((result) => {
      if (result.success && result.data) {
        setStats(result.data)
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const assessmentProgress = stats ? (stats.assessed / stats.total) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Assessment Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Assessment Progress
              </CardTitle>
              <CardDescription>
                {stats?.assessed || 0} of {stats?.total || 0} controls assessed ({Math.round(assessmentProgress)}%)
              </CardDescription>
            </div>
            {!isAssessmentInProgress && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                Assessment Not Started
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={assessmentProgress} className="h-3" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-semibold">{stats?.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-lg font-semibold text-green-600">{stats?.met || 0}</div>
                <div className="text-xs text-muted-foreground">Met</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-lg font-semibold text-red-600">{stats?.notMet || 0}</div>
                <div className="text-xs text-muted-foreground">Not Met</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-400/10">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-lg font-semibold text-gray-500">{stats?.notApplicable || 0}</div>
                <div className="text-xs text-muted-foreground">N/A</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-500/10">
              <Minus className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-lg font-semibold text-gray-500">{stats?.notAssessed || 0}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search controls by ID or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={determinationFilter} onValueChange={setDeterminationFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Determinations</SelectItem>
                  <SelectItem value="NOT_ASSESSED">Not Assessed</SelectItem>
                  <SelectItem value="MET">Met</SelectItem>
                  <SelectItem value="NOT_MET">Not Met</SelectItem>
                  <SelectItem value="NOT_APPLICABLE">N/A</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedFamilies(new Set(filteredGroups.map((g) => g.family.code)))}
              >
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpandedFamilies(new Set())}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls by Family */}
      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const familyStats = getFamilyStats(group.controls)
          const isExpanded = expandedFamilies.has(group.family.code)
          const familyProgress = group.controls.length > 0
            ? ((familyStats.met + familyStats.notMet + familyStats.notApplicable) / group.controls.length) * 100
            : 0

          return (
            <Collapsible
              key={group.family.code}
              open={isExpanded}
              onOpenChange={() => toggleFamily(group.family.code)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Badge className={familyColors[group.family.code] || 'bg-gray-500/10'}>
                          {group.family.code}
                        </Badge>
                        <div>
                          <CardTitle className="text-base">{group.family.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {group.controls.length} controls | {Math.round(familyProgress)}% assessed
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-xs">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded ${determinationColors.MET.bg}`}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-green-600 font-medium">{familyStats.met}</span>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded ${determinationColors.NOT_MET.bg}`}>
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-red-600 font-medium">{familyStats.notMet}</span>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded ${determinationColors.NOT_ASSESSED.bg}`}>
                            <Minus className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-gray-600 font-medium">{familyStats.notAssessed}</span>
                          </div>
                        </div>
                        <Progress value={familyProgress} className="w-24 h-2 hidden sm:block" />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {group.controls.map((rs) => {
                      const finding = findingsMap.get(rs.requirement.id)
                      return (
                        <AssessorControlCard
                          key={rs.id}
                          engagementId={engagementId}
                          requirement={rs.requirement}
                          customerStatus={{
                            id: rs.id,
                            status: rs.status,
                            implementationNotes: rs.implementationNotes,
                          }}
                          existingFinding={finding ? {
                            ...finding,
                            riskLevel: finding.riskLevel as 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | null,
                          } : null}
                          onFindingSaved={(newFinding) =>
                            handleFindingSaved(rs.requirement.id, newFinding as AssessmentFinding)
                          }
                        />
                      )
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}

        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No controls found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
