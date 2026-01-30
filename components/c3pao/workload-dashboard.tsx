'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  Crown,
  User,
  ExternalLink,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { getC3PAOWorkloadOverview, getAssessorWorkload } from '@/app/actions/c3pao-workload'
import { Progress } from '@/components/ui/progress'

interface AssessorWorkload {
  id: string
  name: string
  email: string
  jobTitle: string | null
  isLeadAssessor: boolean
  ccaNumber: string | null
  ccpNumber: string | null
  activeEngagements: number
  pendingEngagements: number
  completedEngagements: number
  totalAssigned: number
}

interface WorkloadOverview {
  assessors: AssessorWorkload[]
  engagementsByStatus: Record<string, number>
  totalActiveEngagements: number
  totalAssessors: number
  totalEngagements: number
}

interface AssessorDetail {
  assessor: {
    id: string
    name: string
    email: string
    jobTitle: string | null
    isLeadAssessor: boolean
    ccaNumber: string | null
    ccpNumber: string | null
  }
  engagements: Array<{
    id: string
    packageName: string
    organizationName: string
    status: string
    role: string
    targetLevel: string
    startedAt: Date | null
    completedAt: Date | null
    assignedAt: Date
  }>
  stats: {
    active: number
    pending: number
    completed: number
    total: number
  }
}

export function WorkloadDashboard() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<WorkloadOverview | null>(null)
  const [selectedAssessor, setSelectedAssessor] = useState<string>('all')
  const [assessorDetail, setAssessorDetail] = useState<AssessorDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    loadOverview()
  }, [])

  useEffect(() => {
    if (selectedAssessor && selectedAssessor !== 'all') {
      loadAssessorDetail(selectedAssessor)
    } else {
      setAssessorDetail(null)
    }
  }, [selectedAssessor])

  async function loadOverview() {
    setLoading(true)
    try {
      const result = await getC3PAOWorkloadOverview()
      if (result.success && result.data) {
        setOverview(result.data)
      }
    } catch (error) {
      console.error('Failed to load workload overview:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAssessorDetail(assessorId: string) {
    setLoadingDetail(true)
    try {
      const result = await getAssessorWorkload(assessorId)
      if (result.success && result.data) {
        setAssessorDetail(result.data)
      }
    } catch (error) {
      console.error('Failed to load assessor detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge className="bg-purple-500/10 text-purple-700 border-purple-200">In Progress</Badge>
      case 'COMPLETED':
        return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">Completed</Badge>
      case 'REQUESTED':
      case 'PENDING':
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'PROPOSAL_SENT':
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">Proposal Sent</Badge>
      case 'PROPOSAL_ACCEPTED':
      case 'ACCEPTED':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200">Accepted</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'LEAD':
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200"><Crown className="h-3 w-3 mr-1" />Lead</Badge>
      case 'ASSESSOR':
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200"><User className="h-3 w-3 mr-1" />Assessor</Badge>
      case 'OBSERVER':
        return <Badge variant="secondary">Observer</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Failed to Load</h3>
          <p className="text-muted-foreground mt-1">
            Could not load workload data. Please try again.
          </p>
          <Button className="mt-4" onClick={loadOverview}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Calculate max workload for progress bars
  const maxWorkload = Math.max(...overview.assessors.map((a) => a.activeEngagements), 1)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assessors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalAssessors}</div>
            <p className="text-xs text-muted-foreground">
              {overview.assessors.filter((a) => a.isLeadAssessor).length} lead assessors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Assessments</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalActiveEngagements}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.engagementsByStatus['COMPLETED'] || 0}</div>
            <p className="text-xs text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg per Assessor</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.totalAssessors > 0
                ? (overview.totalActiveEngagements / overview.totalAssessors).toFixed(1)
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Active engagements</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by Assessor:</span>
          <Select value={selectedAssessor} onValueChange={setSelectedAssessor}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All assessors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assessors</SelectItem>
              {overview.assessors.map((assessor) => (
                <SelectItem key={assessor.id} value={assessor.id}>
                  <div className="flex items-center gap-2">
                    {assessor.isLeadAssessor && <Crown className="h-3 w-3 text-yellow-600" />}
                    {assessor.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assessor Detail View */}
      {selectedAssessor !== 'all' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {loadingDetail ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : assessorDetail?.assessor.isLeadAssessor ? (
                <Crown className="h-5 w-5 text-yellow-600" />
              ) : (
                <User className="h-5 w-5" />
              )}
              {assessorDetail?.assessor.name || 'Loading...'}
            </CardTitle>
            {assessorDetail && (
              <CardDescription>
                {assessorDetail.assessor.jobTitle || assessorDetail.assessor.email}
                {assessorDetail.assessor.ccaNumber && ` | CCA: ${assessorDetail.assessor.ccaNumber}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : assessorDetail ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-2xl font-bold text-purple-700">{assessorDetail.stats.active}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                    <div className="text-2xl font-bold text-yellow-700">{assessorDetail.stats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                    <div className="text-2xl font-bold text-emerald-700">{assessorDetail.stats.completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl font-bold">{assessorDetail.stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>

                {/* Engagements Table */}
                {assessorDetail.engagements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessorDetail.engagements.map((eng) => (
                        <TableRow key={eng.id}>
                          <TableCell className="font-medium">{eng.packageName}</TableCell>
                          <TableCell>{eng.organizationName}</TableCell>
                          <TableCell>{getStatusBadge(eng.status)}</TableCell>
                          <TableCell>{getRoleBadge(eng.role)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{eng.targetLevel}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/engagements/${eng.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No engagements assigned yet.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Team Workload Table */}
      {selectedAssessor === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Team Workload</CardTitle>
            <CardDescription>
              Overview of engagement distribution across your assessment team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.assessors.map((assessor) => (
                  <TableRow key={assessor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {assessor.isLeadAssessor && <Crown className="h-3 w-3 text-yellow-600" />}
                          {assessor.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assessor.jobTitle || assessor.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {assessor.isLeadAssessor ? (
                        <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200">Lead</Badge>
                      ) : (
                        <Badge variant="secondary">Assessor</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-purple-700">{assessor.activeEngagements}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-yellow-700">{assessor.pendingEngagements}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-emerald-700">{assessor.completedEngagements}</span>
                    </TableCell>
                    <TableCell className="w-[150px]">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(assessor.activeEngagements / maxWorkload) * 100}
                          className="h-2"
                        />
                        <span className="text-xs text-muted-foreground w-8">
                          {assessor.activeEngagements}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAssessor(assessor.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
