'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Building2,
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getC3PAOEngagements } from '@/app/actions/c3pao-dashboard'
import { formatDistanceToNow } from 'date-fns'

interface Engagement {
  id: string
  status: string
  targetLevel: string
  customerNotes: string | null
  createdAt: Date
  updatedAt: Date
  atoPackage: {
    id: string
    name: string
    cmmcLevel: string
    organization: {
      name: string
    } | null
  } | null
}

export default function C3PAOEngagementsPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || 'all'

  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  useEffect(() => {
    loadEngagements()
  }, [])

  async function loadEngagements() {
    setLoading(true)
    try {
      const result = await getC3PAOEngagements()
      if (result.success && result.data) {
        setEngagements(result.data as Engagement[])
      }
    } catch (error) {
      console.error('Error loading engagements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEngagements = engagements.filter(engagement => {
    const matchesSearch =
      engagement.atoPackage?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      engagement.atoPackage?.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && engagement.status === statusFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">New Request</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Pending</Badge>
      case 'ACCEPTED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Accepted</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">In Progress</Badge>
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'PENDING':
      case 'ACCEPTED':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-purple-600" />
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      default:
        return <Building2 className="h-5 w-5 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Engagements</h1>
        <p className="text-muted-foreground">
          Manage your assessment engagements with customers
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Engagements</CardTitle>
          <CardDescription>
            View and manage customer assessment requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by organization or package name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="REQUESTED">New Requests</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredEngagements.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Engagements Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'When customers request assessments, they will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEngagements.map((engagement) => (
                <Link
                  key={engagement.id}
                  href={`/engagements/${engagement.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getStatusIcon(engagement.status)}
                    </div>
                    <div>
                      <p className="font-medium">{engagement.atoPackage?.name || 'Unknown Package'}</p>
                      <p className="text-sm text-muted-foreground">
                        {engagement.atoPackage?.organization?.name || 'Unknown Organization'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(engagement.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {engagement.targetLevel.replace('_', ' ')}
                    </Badge>
                    {getStatusBadge(engagement.status)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
