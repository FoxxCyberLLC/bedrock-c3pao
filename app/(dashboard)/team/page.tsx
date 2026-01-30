'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Mail,
  Phone,
  Award,
  Calendar,
  Clock,
  ShieldCheck,
  Plus,
  Pencil,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getC3PAOTeam, getCurrentC3PAOUser } from '@/app/actions/c3pao-dashboard'
import { formatDistanceToNow } from 'date-fns'
import { AddTeamMemberDialog } from '@/components/add-team-member-dialog'
import { EditTeamMemberDialog } from '@/components/edit-team-member-dialog'

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string | null
  jobTitle: string | null
  ccaNumber: string | null
  ccpNumber: string | null
  isLeadAssessor: boolean
  status: string
  lastLogin: Date | null
  createdAt: Date
  _count: {
    engagements: number
  }
}

interface CurrentUser {
  id: string
  isLeadAssessor: boolean
}

export default function C3PAOTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [teamResult, userResult] = await Promise.all([
        getC3PAOTeam(),
        getCurrentC3PAOUser(),
      ])
      if (teamResult.success && teamResult.data) {
        setTeam(teamResult.data as TeamMember[])
      }
      if (userResult.success && userResult.data) {
        setCurrentUser(userResult.data as CurrentUser)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleEditMember(member: TeamMember) {
    setSelectedMember(member)
    setEditDialogOpen(true)
  }

  const isLead = currentUser?.isLeadAssessor ?? false

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Active</Badge>
      case 'INACTIVE':
        return <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">Inactive</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate stats
  const leadAssessors = team.filter(m => m.isLeadAssessor).length
  const activeMembers = team.filter(m => m.status === 'ACTIVE').length
  const totalEngagements = team.reduce((sum, m) => sum + (m._count?.engagements || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            {isLead ? 'Manage' : 'View'} your organization&apos;s assessors and team members
          </p>
        </div>
        {isLead && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.length}</div>
            <p className="text-xs text-muted-foreground">Total members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Lead Assessors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{leadAssessors}</div>
            <p className="text-xs text-muted-foreground">Certified leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Engagements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEngagements}</div>
            <p className="text-xs text-muted-foreground">Assigned assessments</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Assessors and staff in your C3PAO organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Team Members</h3>
              <p className="text-muted-foreground">
                {isLead ? 'Add your first team member to get started' : 'Contact your lead assessor to add team members'}
              </p>
              {isLead && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Engagements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  {isLead && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.name}
                            {member.isLeadAssessor && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-xs">
                                Lead
                              </Badge>
                            )}
                            {member.id === currentUser?.id && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {member.jobTitle || 'Assessor'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {member.ccaNumber && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              CCA: {member.ccaNumber}
                            </Badge>
                          </div>
                        )}
                        {member.ccpNumber && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              CCP: {member.ccpNumber}
                            </Badge>
                          </div>
                        )}
                        {!member.ccaNumber && !member.ccpNumber && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{member._count?.engagements || 0}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(member.status)}
                    </TableCell>
                    <TableCell>
                      {member.lastLogin ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(member.lastLogin), { addSuffix: true })}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    {isLead && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMember(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card - only show for non-leads */}
      {!isLead && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Team member management is handled by lead assessors.
              Contact your lead assessor to add or remove team members, or to update credentials.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddTeamMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={loadData}
      />

      <EditTeamMemberDialog
        member={selectedMember}
        currentUserId={currentUser?.id || ''}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
