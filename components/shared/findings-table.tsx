'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { safeDate } from '@/lib/utils'
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  MessageSquare,
  FileSearch,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Finding {
  id: string
  determination: string
  finding?: string | null
  deficiency?: string | null
  recommendation?: string | null
  riskLevel?: string | null
  methodInterview: boolean
  methodExamine: boolean
  methodTest: boolean
  assessedAt?: Date | string | null
  requirement: {
    id: string
    requirementId: string
    title: string
    family: {
      code: string
      name: string
    }
  }
  assessedBy?: {
    name: string
  } | null
}

interface FindingsTableProps {
  findings: Finding[]
  showExport?: boolean
  className?: string
}

type SortField = 'requirementId' | 'determination' | 'riskLevel' | 'assessedAt'
type SortOrder = 'asc' | 'desc'

const determinationConfig = {
  MET: {
    icon: CheckCircle,
    label: 'MET',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  NOT_MET: {
    icon: XCircle,
    label: 'NOT MET',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  NOT_APPLICABLE: {
    icon: MinusCircle,
    label: 'N/A',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
  },
  NOT_ASSESSED: {
    icon: AlertTriangle,
    label: 'Pending',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
}

const riskLevelConfig = {
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  MODERATE: {
    label: 'Moderate',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  LOW: {
    label: 'Low',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
}

export function FindingsTable({
  findings,
  showExport = false,
  className,
}: FindingsTableProps) {
  const [search, setSearch] = useState('')
  const [filterDetermination, setFilterDetermination] = useState<string>('')
  const [filterFamily, setFilterFamily] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('requirementId')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Get unique families for filter
  const families = useMemo(() => {
    const familySet = new Set(findings.map((f) => f.requirement.family.code))
    return Array.from(familySet).sort()
  }, [findings])

  // Filter and sort findings
  const processedFindings = useMemo(() => {
    let result = [...findings]

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (f) =>
          f.requirement.requirementId.toLowerCase().includes(searchLower) ||
          f.requirement.title.toLowerCase().includes(searchLower) ||
          f.requirement.family.name.toLowerCase().includes(searchLower)
      )
    }

    // Apply determination filter
    if (filterDetermination) {
      result = result.filter((f) => f.determination === filterDetermination)
    }

    // Apply family filter
    if (filterFamily) {
      result = result.filter((f) => f.requirement.family.code === filterFamily)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'requirementId':
          comparison = a.requirement.requirementId.localeCompare(
            b.requirement.requirementId
          )
          break
        case 'determination':
          comparison = a.determination.localeCompare(b.determination)
          break
        case 'riskLevel':
          const riskOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 }
          const aRisk = a.riskLevel ? riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 99 : 99
          const bRisk = b.riskLevel ? riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 99 : 99
          comparison = aRisk - bRisk
          break
        case 'assessedAt':
          const aDate = a.assessedAt ? new Date(a.assessedAt).getTime() : 0
          const bDate = b.assessedAt ? new Date(b.assessedAt).getTime() : 0
          comparison = aDate - bDate
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [findings, search, filterDetermination, filterFamily, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const exportToCSV = () => {
    const headers = [
      'Control ID',
      'Family',
      'Title',
      'Determination',
      'Risk Level',
      'Deficiency',
      'Recommendation',
      'Methods',
      'Assessed Date',
      'Assessor',
    ]

    const rows = processedFindings.map((f) => [
      f.requirement.requirementId,
      `${f.requirement.family.code}: ${f.requirement.family.name}`,
      f.requirement.title,
      f.determination,
      f.riskLevel || '',
      f.deficiency || '',
      f.recommendation || '',
      [
        f.methodInterview && 'Interview',
        f.methodExamine && 'Examine',
        f.methodTest && 'Test',
      ]
        .filter(Boolean)
        .join(', '),
      safeDate(f.assessedAt) ? format(safeDate(f.assessedAt)!, 'yyyy-MM-dd') : '',
      f.assessedBy?.name || '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute(
      'download',
      `assessment-findings-${format(new Date(), 'yyyy-MM-dd')}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by control ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Determination filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterDetermination}
            onChange={(e) => setFilterDetermination(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="">All Results</option>
            <option value="MET">MET</option>
            <option value="NOT_MET">NOT MET</option>
            <option value="NOT_APPLICABLE">N/A</option>
          </select>
        </div>

        {/* Family filter */}
        <select
          value={filterFamily}
          onChange={(e) => setFilterFamily(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
        >
          <option value="">All Families</option>
          {families.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>

        {/* Export button */}
        {showExport && (
          <button
            type="button"
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Showing {processedFindings.length} of {findings.length} findings
      </p>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <SortableHeader
                label="Control"
                field="requirementId"
                currentField={sortField}
                order={sortOrder}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <SortableHeader
                label="Result"
                field="determination"
                currentField={sortField}
                order={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label="Risk"
                field="riskLevel"
                currentField={sortField}
                order={sortOrder}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Methods
              </th>
              <SortableHeader
                label="Date"
                field="assessedAt"
                currentField={sortField}
                order={sortOrder}
                onSort={handleSort}
              />
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {processedFindings.map((finding) => (
              <FindingRow
                key={finding.id}
                finding={finding}
                isExpanded={expandedIds.has(finding.id)}
                onToggle={() => toggleExpanded(finding.id)}
              />
            ))}
          </tbody>
        </table>

        {processedFindings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No findings match your filters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function SortableHeader({
  label,
  field,
  currentField,
  order,
  onSort,
}: {
  label: string
  field: SortField
  currentField: SortField
  order: SortOrder
  onSort: (field: SortField) => void
}) {
  const isActive = currentField === field

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          order === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </th>
  )
}

function FindingRow({
  finding,
  isExpanded,
  onToggle,
}: {
  finding: Finding
  isExpanded: boolean
  onToggle: () => void
}) {
  const detConfig =
    determinationConfig[finding.determination as keyof typeof determinationConfig] ||
    determinationConfig.NOT_ASSESSED
  const DetIcon = detConfig.icon

  const riskConfig = finding.riskLevel
    ? riskLevelConfig[finding.riskLevel as keyof typeof riskLevelConfig]
    : null

  const hasDetails =
    finding.finding || finding.deficiency || finding.recommendation

  return (
    <>
      <tr
        className={cn(
          'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
          hasDetails && 'cursor-pointer'
        )}
        onClick={hasDetails ? onToggle : undefined}
      >
        <td className="px-4 py-3">
          <div>
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
              {finding.requirement.requirementId}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {finding.requirement.family.code}
            </p>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-900 dark:text-white line-clamp-1">
            {finding.requirement.title}
          </p>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                detConfig.bgColor,
                detConfig.color
              )}
            >
              <DetIcon className="h-3.5 w-3.5" />
              {detConfig.label}
            </span>
            {finding.finding && (
              <span
                title="Has assessor comments - click to expand"
                className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded"
              >
                <MessageSquare className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {riskConfig ? (
            <span
              className={cn(
                'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
                riskConfig.bgColor,
                riskConfig.color
              )}
            >
              {riskConfig.label}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-600">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {finding.methodInterview && (
              <span
                title="Interview"
                className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded"
              >
                <MessageSquare className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </span>
            )}
            {finding.methodExamine && (
              <span
                title="Examine"
                className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded"
              >
                <FileSearch className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </span>
            )}
            {finding.methodTest && (
              <span
                title="Test"
                className="p-1 bg-green-100 dark:bg-green-900/30 rounded"
              >
                <Wrench className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {safeDate(finding.assessedAt)
              ? format(safeDate(finding.assessedAt)!, 'MMM d, yyyy')
              : '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          {hasDetails && (
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <tr className="bg-gray-50 dark:bg-gray-800/30">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-4">
              {/* Assessor Findings - prominent amber styling */}
              {finding.finding && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    C3PAO Assessor Findings
                  </h5>
                  <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                    {finding.finding}
                  </p>
                </div>
              )}

              {/* Deficiency and Recommendation in a grid if present */}
              {(finding.deficiency || finding.recommendation) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {finding.deficiency && finding.deficiency !== finding.finding && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                      <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">
                        Deficiency Identified
                      </h5>
                      <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
                        {finding.deficiency}
                      </p>
                    </div>
                  )}
                  {finding.recommendation && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <h5 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-2">
                        Recommendation
                      </h5>
                      <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                        {finding.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {finding.assessedBy && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Assessed by {finding.assessedBy.name}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
