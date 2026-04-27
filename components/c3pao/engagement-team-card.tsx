'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Crown,
  User,
  Eye,
  MoreVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Layers,
} from 'lucide-react'
import { TeamAssignmentDialog } from './team-assignment-dialog'
import { DomainAssignmentDialog } from './domain-assignment-dialog'
import {
  removeAssessorFromEngagement,
  updateAssessorRole,
} from '@/app/actions/c3pao-team-assignment'
// Prisma types replaced - data comes from SaaS API as JSON
import { formatDistanceToNow } from 'date-fns'
import { safeDate } from '@/lib/utils'

type EngagementAssessorRole = 'LEAD_ASSESSOR' | 'ASSESSOR' | 'OBSERVER' | string

interface TeamMember {
  id: string
  assessorId: string
  name: string
  email: string
  role: EngagementAssessorRole
  assessorType: string
  jobTitle?: string | null
  assignedAt: string
  domains: string[]
}

interface EngagementTeamCardProps {
  engagementId: string
  team: TeamMember[]
  isLeadAssessor: boolean
  onTeamUpdated: () => void
}

const roleConfig: Record<EngagementAssessorRole, { icon: React.ReactNode; color: string; label: string }> = {
  LEAD: {
    icon: <Crown className="h-3 w-3" />,
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    label: 'Lead',
  },
  ASSESSOR: {
    icon: <User className="h-3 w-3" />,
    color: 'bg-blue-500/10 text-blue-700 border-blue-200',
    label: 'Assessor',
  },
  OBSERVER: {
    icon: <Eye className="h-3 w-3" />,
    color: 'bg-gray-500/10 text-gray-700 border-gray-200',
    label: 'Observer',
  },
}

export function EngagementTeamCard({
  engagementId,
  team,
  isLeadAssessor,
  onTeamUpdated,
}: EngagementTeamCardProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [editDomainsFor, setEditDomainsFor] = useState<TeamMember | null>(null)

  async function handleRemove(member: TeamMember) {
    setRemovingId(member.assessorId)
    try {
      const result = await removeAssessorFromEngagement({
        engagementId,
        assessorId: member.assessorId,
      })

      if (result.success) {
        toast.success(`${member.name} removed from team`)
        onTeamUpdated()
      } else {
        toast.error(result.error || 'Failed to remove team member')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setRemovingId(null)
      setConfirmRemove(null)
    }
  }

  async function handleRoleChange(member: TeamMember, newRole: EngagementAssessorRole) {
    if (member.role === newRole) return

    setUpdatingRole(member.assessorId)
    try {
      const result = await updateAssessorRole({
        engagementId,
        assessorId: member.assessorId,
        role: newRole,
      })

      if (result.success) {
        toast.success(`${member.name} role updated to ${roleConfig[newRole].label}`)
        onTeamUpdated()
      } else {
        toast.error(result.error || 'Failed to update role')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setUpdatingRole(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assessment Team
            <Badge variant="secondary" className="ml-2">
              {team.length}
            </Badge>
          </CardTitle>
          {isLeadAssessor && (
            <Button size="sm" onClick={() => setShowAssignDialog(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No team members assigned yet.</p>
              {isLeadAssessor && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setShowAssignDialog(true)}
                >
                  Assign team members
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {team.map((member) => {
                const config = roleConfig[member.role]
                const isUpdating = updatingRole === member.assessorId
                const isRemoving = removingId === member.assessorId

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{member.name}</span>
                          <Badge variant="outline" className={`text-xs ${config.color}`}>
                            {config.label}
                          </Badge>
                          {member.domains.map((code) => (
                            <Badge
                              key={code}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 font-mono"
                            >
                              {code}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.jobTitle || member.email}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Assigned {safeDate(member.assignedAt) ? formatDistanceToNow(safeDate(member.assignedAt)!, { addSuffix: true }) : '--'}
                        </div>
                      </div>
                    </div>

                    {isLeadAssessor && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isUpdating || isRemoving}>
                            {isUpdating || isRemoving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== 'LEAD' && (
                            <DropdownMenuItem onClick={() => handleRoleChange(member, 'LEAD')}>
                              <ArrowUp className="h-4 w-4 mr-2" />
                              Promote to Lead
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'ASSESSOR' && (
                            <DropdownMenuItem onClick={() => handleRoleChange(member, 'ASSESSOR')}>
                              <User className="h-4 w-4 mr-2" />
                              Set as Assessor
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'OBSERVER' && (
                            <DropdownMenuItem onClick={() => handleRoleChange(member, 'OBSERVER')}>
                              <ArrowDown className="h-4 w-4 mr-2" />
                              Set as Observer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditDomainsFor(member)}>
                            <Layers className="h-4 w-4 mr-2" />
                            Edit Domains
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setConfirmRemove(member)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TeamAssignmentDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        engagementId={engagementId}
        onSuccess={onTeamUpdated}
      />

      {editDomainsFor && (
        <DomainAssignmentDialog
          key={editDomainsFor.assessorId}
          open={!!editDomainsFor}
          onOpenChange={(open) => {
            if (!open) setEditDomainsFor(null)
          }}
          engagementId={engagementId}
          assessorId={editDomainsFor.assessorId}
          assessorName={editDomainsFor.name}
          initialDomains={editDomainsFor.domains}
          onSuccess={onTeamUpdated}
        />
      )}

      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {confirmRemove?.name} from this engagement?
              They will no longer have access to this assessment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
