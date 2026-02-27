'use client'

import React, { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Minus,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  ExternalLink,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import { getRequirementValue, getRequirementCriticality, getCmmcDisplayId } from '@/lib/cmmc/requirement-values'
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

interface Evidence {
  id: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  description: string | null
  createdAt: Date
}

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

interface ObjectiveStatus {
  id: string
  status: 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'
  assessmentNotes: string | null
  officialAssessment?: boolean
  officialAssessorId?: string | null
}

interface AssessmentObjective {
  id: string
  objectiveId: string
  objectiveReference: string
  description: string
  sortOrder: number
  statuses?: ObjectiveStatus[]
}

interface RequirementWithObjectives extends Requirement {
  objectives?: AssessmentObjective[]
}

interface RequirementStatus {
  id: string
  status: string
  implementationNotes: string | null
  assessmentNotes: string | null
  requirement: RequirementWithObjectives
  evidence: Evidence[]
}

interface AssessmentControlsTableProps {
  requirementStatuses: RequirementStatus[]
  readOnly?: boolean
  assessmentModeActive?: boolean
  engagementId?: string
}

const statusOptions = [
  { value: 'NOT_STARTED', label: 'Not Started', icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { value: 'COMPLIANT', label: 'Met', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { value: 'NON_COMPLIANT', label: 'Not Met', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { value: 'NOT_APPLICABLE', label: 'N/A', icon: AlertCircle, color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
]

const objectiveStatusOptions = [
  { value: 'NOT_ASSESSED', label: 'Not Assessed', icon: Minus, color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800/50' },
  { value: 'MET', label: 'Met (Official)', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30' },
  { value: 'NOT_MET', label: 'Not Met (Official)', icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  { value: 'NOT_APPLICABLE', label: 'N/A', icon: AlertCircle, color: 'text-gray-400 dark:text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-800/30' },
]

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

export function AssessmentControlsTable({
  requirementStatuses,
  readOnly = true,
  assessmentModeActive = false,
  engagementId,
}: AssessmentControlsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pointsFilter, setPointsFilter] = useState<string>('all')
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [expandedControls, setExpandedControls] = useState<Set<string>>(new Set())

  // Toggle control expansion (for showing objectives)
  const toggleControl = (controlId: string) => {
    setExpandedControls((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(controlId)) {
        newSet.delete(controlId)
      } else {
        newSet.add(controlId)
      }
      return newSet
    })
  }

  // Get objective status display
  const getObjectiveStatusDisplay = (status: string, isOfficial?: boolean) => {
    const option = objectiveStatusOptions.find((opt) => opt.value === status) || objectiveStatusOptions[0]
    const Icon = option.icon
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${option.bgColor} ${isOfficial ? 'border-2 border-current' : ''}`}>
        <Icon className={`h-3.5 w-3.5 ${option.color}`} />
        <span className={`text-xs font-medium ${option.color}`}>{option.label}</span>
        {isOfficial && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Official</Badge>}
      </div>
    )
  }

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

  // Get point value display
  const getPointValueDisplay = (requirementId: string) => {
    const reqValue = getRequirementValue(requirementId)
    const criticality = getRequirementCriticality(requirementId)

    if (reqValue.displayValue === 'N/A') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
          <span className="text-xs font-medium text-gray-500">N/A</span>
        </div>
      )
    }

    const styles = {
      critical: {
        bg: 'bg-red-100 dark:bg-red-950/50',
        text: 'text-red-700 dark:text-red-400',
        icon: AlertTriangle,
        label: 'Critical'
      },
      important: {
        bg: 'bg-amber-100 dark:bg-amber-950/50',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Shield,
        label: 'Important'
      },
      standard: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        icon: null,
        label: 'Standard'
      }
    }

    const style = styles[criticality]
    const Icon = style.icon

    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${style.bg}`} title={`${style.label} - ${reqValue.value} points`}>
        {Icon && <Icon className={`h-3 w-3 ${style.text}`} />}
        <span className={`text-xs font-bold ${style.text}`}>{reqValue.displayValue}</span>
        <span className={`text-[10px] ${style.text} opacity-70`}>pts</span>
      </div>
    )
  }

  // Filter controls
  const filteredGroups = useMemo(() => {
    return groupedControls.map((group) => ({
      ...group,
      controls: group.controls.filter((rs) => {
        const matchesSearch =
          rs.requirement.requirementId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rs.requirement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rs.requirement.basicRequirement.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || rs.status === statusFilter

        // Filter by point value
        let matchesPoints = true
        if (pointsFilter !== 'all') {
          const reqValue = getRequirementValue(rs.requirement.requirementId)
          if (pointsFilter === 'critical') {
            matchesPoints = reqValue.value === 5
          } else if (pointsFilter === 'important') {
            matchesPoints = reqValue.value === 3
          } else if (pointsFilter === 'standard') {
            matchesPoints = reqValue.value === 1
          }
        }

        return matchesSearch && matchesStatus && matchesPoints
      }),
    })).filter((group) => group.controls.length > 0)
  }, [groupedControls, searchQuery, statusFilter, pointsFilter])

  // Calculate stats per family
  const getFamilyStats = useCallback((controls: RequirementStatus[]) => {
    const stats = {
      total: controls.length,
      met: 0,
      notMet: 0,
      inProgress: 0,
      notStarted: 0,
      notApplicable: 0,
    }

    controls.forEach((rs) => {
      switch (rs.status) {
        case 'COMPLIANT':
          stats.met++
          break
        case 'NON_COMPLIANT':
          stats.notMet++
          break
        case 'IN_PROGRESS':
          stats.inProgress++
          break
        case 'NOT_APPLICABLE':
          stats.notApplicable++
          break
        default:
          stats.notStarted++
      }
    })

    return stats
  }, [])

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

  // Expand/Collapse all
  const expandAll = () => {
    setExpandedFamilies(new Set(filteredGroups.map((g) => g.family.code)))
  }

  const collapseAll = () => {
    setExpandedFamilies(new Set())
  }

  // Get status display
  const getStatusDisplay = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status) || statusOptions[0]
    const Icon = option.icon
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${option.bgColor}`}>
        <Icon className={`h-3.5 w-3.5 ${option.color}`} />
        <span className={`text-xs font-medium ${option.color}`}>{option.label}</span>
      </div>
    )
  }

  // Overall stats (OSC + C3PAO)
  const overallStats = useMemo(() => {
    const stats = {
      total: requirementStatuses.length,
      // OSC stats
      met: 0,
      notMet: 0,
      inProgress: 0,
      notStarted: 0,
      assessed: 0,
      // C3PAO objective stats
      totalObjectives: 0,
      objectivesAssessed: 0,
      objectivesMet: 0,
      objectivesNotMet: 0,
    }

    requirementStatuses.forEach((rs) => {
      switch (rs.status) {
        case 'COMPLIANT':
          stats.met++
          stats.assessed++
          break
        case 'NON_COMPLIANT':
          stats.notMet++
          stats.assessed++
          break
        case 'IN_PROGRESS':
          stats.inProgress++
          break
        case 'NOT_APPLICABLE':
          stats.assessed++
          break
        default:
          stats.notStarted++
      }

      // C3PAO objective stats
      const objs = rs.requirement.objectives || []
      stats.totalObjectives += objs.length
      objs.forEach((obj) => {
        const objStatus = obj.statuses?.[0]?.status
        if (objStatus && objStatus !== 'NOT_ASSESSED') {
          stats.objectivesAssessed++
          if (objStatus === 'MET') stats.objectivesMet++
          if (objStatus === 'NOT_MET') stats.objectivesNotMet++
        }
      })
    })

    return stats
  }, [requirementStatuses])

  return (
    <div className="space-y-4">
      {/* Overall Progress Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">NIST SP 800-171 Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* C3PAO Assessment Progress (primary) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">C3PAO Assessment Progress</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">
                  {overallStats.totalObjectives > 0 ? Math.round((overallStats.objectivesAssessed / overallStats.totalObjectives) * 100) : 0}%
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {overallStats.objectivesAssessed}/{overallStats.totalObjectives} objectives
                </span>
              </div>
            </div>
            <Progress value={overallStats.totalObjectives > 0 ? (overallStats.objectivesAssessed / overallStats.totalObjectives) * 100 : 0} className="h-3" />
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-xl font-bold text-green-700 dark:text-green-300">{overallStats.objectivesMet}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">Met</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <div className="text-xl font-bold text-red-700 dark:text-red-300">{overallStats.objectivesNotMet}</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Not Met</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <div>
                  <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{overallStats.totalObjectives - overallStats.objectivesAssessed}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Remaining</div>
                </div>
              </div>
            </div>
          </div>

          {/* OSC Self-Assessment Summary (secondary) */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">OSC Self-Assessment</span>
              <span className="text-xs text-muted-foreground">
                {overallStats.assessed}/{overallStats.total} controls reported
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">{overallStats.met} Met</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">{overallStats.notMet} Not Met</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">{overallStats.inProgress} In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <Minus className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">{overallStats.notStarted} Not Started</span>
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
                placeholder="Search controls by ID, title, or requirement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={pointsFilter} onValueChange={setPointsFilter}>
                <SelectTrigger className="w-[160px]">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by points" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Point Values</SelectItem>
                  <SelectItem value="critical">
                    <span className="flex items-center gap-2">
                      <span className="text-red-600 font-bold">5 pts</span>
                      <span>Critical</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="important">
                    <span className="flex items-center gap-2">
                      <span className="text-amber-600 font-bold">3 pts</span>
                      <span>Important</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="standard">
                    <span className="flex items-center gap-2">
                      <span className="text-slate-600 font-bold">1 pt</span>
                      <span>Standard</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls by Family */}
      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const stats = getFamilyStats(group.controls)
          const isExpanded = expandedFamilies.has(group.family.code)
          const progress = stats.total > 0
            ? ((stats.met + stats.notMet + stats.notApplicable) / stats.total) * 100
            : 0

          return (
            <Collapsible
              key={group.family.code}
              open={isExpanded}
              onOpenChange={() => toggleFamily(group.family.code)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10' : 'bg-muted'}`}>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-primary" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <Badge className={`${familyColors[group.family.code] || 'bg-gray-500/10'} text-sm px-3 py-1`}>
                          {group.family.code}
                        </Badge>
                        <div>
                          <CardTitle className="text-base font-semibold">{group.family.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {stats.total} controls • {Math.round(progress)}% complete
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 dark:bg-green-950/30">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400 font-semibold">{stats.met}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600 dark:text-red-400 font-semibold">{stats.notMet}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/30">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">{stats.inProgress}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800">
                            <Minus className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">{stats.notStarted}</span>
                          </div>
                        </div>
                        <div className="hidden sm:block w-32">
                          <Progress value={progress} className="h-2" />
                          <div className="text-xs text-muted-foreground text-right mt-1">{Math.round(progress)}%</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full table-fixed">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Control ID</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[70px]" title="SPRS Point Value">Points</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">OSC Status</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">C3PAO Assessment</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {group.controls.map((rs) => {
                            const objectives = rs.requirement.objectives || []
                            const isControlExpanded = expandedControls.has(rs.id)
                            const hasObjectives = objectives.length > 0
                            const objectivesAssessed = objectives.filter(
                              obj => obj.statuses?.[0]?.status && obj.statuses[0].status !== 'NOT_ASSESSED'
                            ).length
                            const objMet = objectives.filter(obj => obj.statuses?.[0]?.status === 'MET').length
                            const objNotMet = objectives.filter(obj => obj.statuses?.[0]?.status === 'NOT_MET').length

                            return (
                              <React.Fragment key={rs.id}>
                                <tr className="hover:bg-muted/50 transition-colors group">
                                  <td className="px-4 py-3 w-[140px]">
                                    <div className="flex items-center gap-2">
                                      {hasObjectives && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 hover:bg-primary/10"
                                          onClick={() => toggleControl(rs.id)}
                                        >
                                          {isControlExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-primary" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </Button>
                                      )}
                                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded-md font-semibold text-foreground">
                                        {getCmmcDisplayId(rs.requirement.requirementId, rs.requirement.family.code)}
                                      </code>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-foreground truncate">{rs.requirement.title}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center w-[70px]">
                                    {getPointValueDisplay(rs.requirement.requirementId)}
                                  </td>
                                  <td className="px-4 py-3 w-[100px]">
                                    {getStatusDisplay(rs.status)}
                                  </td>
                                  <td className="px-4 py-3 w-[130px]">
                                    {hasObjectives ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-primary rounded-full transition-all"
                                              style={{ width: `${(objectivesAssessed / objectives.length) * 100}%` }}
                                            />
                                          </div>
                                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {objectivesAssessed}/{objectives.length}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px]">
                                          {objMet > 0 && (
                                            <span className="text-green-600 dark:text-green-400 font-medium">{objMet} Met</span>
                                          )}
                                          {objNotMet > 0 && (
                                            <span className="text-red-600 dark:text-red-400 font-medium">{objNotMet} Not Met</span>
                                          )}
                                          {objectivesAssessed === 0 && (
                                            <span className="text-muted-foreground">Not started</span>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No objectives</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right w-[80px]">
                                    {engagementId ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Link href={`/engagements/${engagementId}/control/${rs.id}`}>
                                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                          Assess
                                        </Link>
                                      </Button>
                                    ) : (
                                      <Button variant="ghost" size="sm" disabled>
                                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                        View
                                      </Button>
                                    )}
                                  </td>
                                </tr>

                                {/* Objectives Accordion Content */}
                                {isControlExpanded && (
                                  <tr>
                                    <td colSpan={6} className="p-0">
                                      <div className="bg-muted/30 px-6 py-5 border-t border-border">
                                        <div className="mb-4 flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                              <span className="text-sm font-bold text-primary">{objectives.length}</span>
                                            </div>
                                            <div>
                                              <h4 className="text-sm font-semibold text-foreground">
                                                Assessment Objectives
                                              </h4>
                                              <p className="text-xs text-muted-foreground">
                                                Per NIST SP 800-171A
                                              </p>
                                            </div>
                                          </div>
                                          {assessmentModeActive && (
                                            <Badge className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                              Assessment Mode Active
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="space-y-3">
                                          {objectives.map((objective) => {
                                            const objStatus = objective.statuses?.[0]
                                            const currentStatus = objStatus?.status || 'NOT_ASSESSED'
                                            const isOfficial = objStatus?.officialAssessment || false

                                            return (
                                              <div
                                                key={objective.id}
                                                className={`p-4 rounded-xl border bg-card flex items-start gap-4 transition-all hover:bg-accent/50 ${
                                                  isOfficial ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-border'
                                                }`}
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded-md font-semibold text-foreground">
                                                      {objective.objectiveReference}
                                                    </code>
                                                    {isOfficial && (
                                                      <Badge className="text-[10px] bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-0">
                                                        Official
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {objective.description}
                                                  </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                  {getObjectiveStatusDisplay(currentStatus, isOfficial)}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
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
