'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ExternalLink, Search } from 'lucide-react'
import { getRequirementValue } from '@/lib/cmmc/requirement-values'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RequirementFamily {
  id?: string
  code: string
  name: string
}

interface ObjectiveStatus {
  id: string
  status: 'NOT_ASSESSED' | 'MET' | 'NOT_MET' | 'NOT_APPLICABLE'
}

interface AssessmentObjective {
  id: string
  statuses?: ObjectiveStatus[]
}

interface Requirement {
  id: string
  requirementId: string
  title: string
  basicRequirement: string
  family: RequirementFamily
  objectives?: AssessmentObjective[]
}

interface Evidence {
  id: string
}

interface RequirementStatus {
  id: string
  status: string
  requirement: Requirement
  evidence: Evidence[]
}

interface AssessmentControlsTableProps {
  requirementStatuses: RequirementStatus[]
  /** Kept for API compatibility — the c3pao controls view is read-mostly. */
  readOnly?: boolean
  assessmentModeActive?: boolean
  engagementId?: string
}

const STATUS_LABELS: Record<string, string> = {
  COMPLIANT: 'Met',
  NON_COMPLIANT: 'Not Met',
  IN_PROGRESS: 'In Progress',
  NOT_STARTED: 'Not Started',
  NOT_APPLICABLE: 'N/A',
}

const STATUS_CLASSES: Record<string, string> = {
  COMPLIANT:
    'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  NON_COMPLIANT:
    'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  IN_PROGRESS:
    'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  NOT_STARTED:
    'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  NOT_APPLICABLE:
    'bg-gray-500/10 text-gray-400 border-gray-500/10',
}

type SortField = 'requirementId' | 'title' | 'family' | 'status' | 'points'
type SortDir = 'asc' | 'desc'

function countMetObjectives(objectives: AssessmentObjective[] | undefined): {
  met: number
  total: number
} {
  if (!objectives || objectives.length === 0) return { met: 0, total: 0 }
  let met = 0
  for (const obj of objectives) {
    const hasMet = obj.statuses?.some((s) => s.status === 'MET') ?? false
    if (hasMet) met++
  }
  return { met, total: objectives.length }
}

function SortableHeader({
  field,
  sortField,
  onToggleSort,
  children,
}: {
  field: SortField
  sortField: SortField
  onToggleSort: (field: SortField) => void
  children: React.ReactNode
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onToggleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded"
      >
        {children}
        <ArrowUpDown
          className={`h-3.5 w-3.5 ${
            sortField === field ? 'text-foreground' : 'text-muted-foreground/50'
          }`}
        />
      </button>
    </TableHead>
  )
}

export function AssessmentControlsTable({
  requirementStatuses,
  engagementId,
}: AssessmentControlsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [familyFilter, setFamilyFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('requirementId')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const families = useMemo(() => {
    const map = new Map<string, string>()
    for (const rs of requirementStatuses) {
      map.set(rs.requirement.family.code, rs.requirement.family.name)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [requirementStatuses])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const rs of requirementStatuses) {
      counts[rs.status] = (counts[rs.status] || 0) + 1
    }
    return counts
  }, [requirementStatuses])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return requirementStatuses
      .filter((rs) => {
        if (statusFilter !== 'all' && rs.status !== statusFilter) return false
        if (familyFilter !== 'all' && rs.requirement.family.code !== familyFilter) return false
        if (q) {
          return (
            rs.requirement.requirementId.toLowerCase().includes(q) ||
            rs.requirement.title.toLowerCase().includes(q) ||
            rs.requirement.family.code.toLowerCase().includes(q) ||
            rs.requirement.family.name.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        let cmp = 0
        switch (sortField) {
          case 'requirementId':
            cmp = a.requirement.requirementId.localeCompare(b.requirement.requirementId)
            break
          case 'title':
            cmp = a.requirement.title.localeCompare(b.requirement.title)
            break
          case 'family':
            cmp = a.requirement.family.code.localeCompare(b.requirement.family.code)
            break
          case 'status':
            cmp = (STATUS_LABELS[a.status] || a.status).localeCompare(
              STATUS_LABELS[b.status] || b.status
            )
            break
          case 'points': {
            const aVal = getRequirementValue(a.requirement.requirementId).value
            const bVal = getRequirementValue(b.requirement.requirementId).value
            cmp = aVal - bVal
            break
          }
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [requirementStatuses, search, statusFilter, familyFilter, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const navigateToControl = (requirementUuid: string) => {
    if (!engagementId) return
    router.push(`/engagements/${engagementId}/control/${requirementUuid}`)
  }

  const hasFilters = search !== '' || statusFilter !== 'all' || familyFilter !== 'all'

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Security Requirements</CardTitle>
          <CardDescription>
            {requirementStatuses.length} controls across {families.length} families
          </CardDescription>
        </div>

        {requirementStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => {
              const count = statusCounts[key] || 0
              if (count === 0) return null
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                  className="transition-opacity"
                >
                  <Badge
                    variant="outline"
                    className={`${STATUS_CLASSES[key]} ${
                      statusFilter === key ? 'ring-2 ring-offset-1 ring-primary' : ''
                    }`}
                  >
                    {label}: {count}
                  </Badge>
                </button>
              )
            })}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {requirementStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No requirements data available.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search controls..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={familyFilter} onValueChange={setFamilyFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Families" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  {families.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {code} — {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                    setFamilyFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="requirementId" sortField={sortField} onToggleSort={toggleSort}>
                      Control ID
                    </SortableHeader>
                    <SortableHeader field="title" sortField={sortField} onToggleSort={toggleSort}>
                      Title
                    </SortableHeader>
                    <SortableHeader field="family" sortField={sortField} onToggleSort={toggleSort}>
                      Family
                    </SortableHeader>
                    <SortableHeader field="status" sortField={sortField} onToggleSort={toggleSort}>
                      Status
                    </SortableHeader>
                    <SortableHeader field="points" sortField={sortField} onToggleSort={toggleSort}>
                      Points
                    </SortableHeader>
                    <TableHead>Objectives</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No controls match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((rs) => {
                      const reqValue = getRequirementValue(rs.requirement.requirementId)
                      const { met, total } = countMetObjectives(rs.requirement.objectives)
                      const interactive = Boolean(engagementId)

                      return (
                        <TableRow
                          key={rs.id}
                          className={
                            interactive ? 'cursor-pointer hover:bg-muted/50' : undefined
                          }
                          onClick={
                            interactive ? () => navigateToControl(rs.requirement.id) : undefined
                          }
                        >
                          <TableCell className="font-mono font-medium text-sm">
                            {rs.requirement.requirementId}
                          </TableCell>
                          <TableCell className="text-sm max-w-[400px] truncate">
                            {rs.requirement.title}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-medium">
                              {rs.requirement.family.code}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_CLASSES[rs.status] || STATUS_CLASSES.NOT_STARTED}>
                              {STATUS_LABELS[rs.status] || rs.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">
                            {reqValue.displayValue === 'N/A' ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              reqValue.displayValue
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {total > 0 ? (
                              `${met} / ${total} met`
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {rs.evidence.length}
                          </TableCell>
                          <TableCell>
                            {interactive && (
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Showing {filtered.length} of {requirementStatuses.length} controls
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
