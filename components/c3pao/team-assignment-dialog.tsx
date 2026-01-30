'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UserPlus, Crown, User, Eye, Loader2 } from 'lucide-react'
import {
  assignAssessorToEngagement,
  getAvailableAssessors,
} from '@/app/actions/c3pao-team-assignment'
// Prisma types replaced - data comes from SaaS API as JSON
type EngagementAssessorRole = 'LEAD_ASSESSOR' | 'ASSESSOR' | 'OBSERVER' | string

interface Assessor {
  id: string
  name: string
  email: string
  jobTitle: string | null
  isLeadAssessor: boolean
  ccaNumber: string | null
  ccpNumber: string | null
}

interface TeamAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engagementId: string
  onSuccess: () => void
}

const roleOptions: { value: EngagementAssessorRole; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'LEAD',
    label: 'Lead Assessor',
    icon: <Crown className="h-4 w-4 text-yellow-600" />,
    description: 'Can manage team, record final results',
  },
  {
    value: 'ASSESSOR',
    label: 'Assessor',
    icon: <User className="h-4 w-4 text-blue-600" />,
    description: 'Can assess controls and add findings',
  },
  {
    value: 'OBSERVER',
    label: 'Observer',
    icon: <Eye className="h-4 w-4 text-gray-500" />,
    description: 'Read-only access to engagement',
  },
]

export function TeamAssignmentDialog({
  open,
  onOpenChange,
  engagementId,
  onSuccess,
}: TeamAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingAssessors, setLoadingAssessors] = useState(false)
  const [availableAssessors, setAvailableAssessors] = useState<Assessor[]>([])
  const [selectedAssessor, setSelectedAssessor] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<EngagementAssessorRole>('ASSESSOR')

  useEffect(() => {
    if (open) {
      loadAvailableAssessors()
    }
  }, [open, engagementId])

  async function loadAvailableAssessors() {
    setLoadingAssessors(true)
    try {
      const result = await getAvailableAssessors(engagementId)
      if (result.success && result.data) {
        setAvailableAssessors(result.data)
      } else {
        toast.error(result.error || 'Failed to load assessors')
      }
    } catch {
      toast.error('Failed to load assessors')
    } finally {
      setLoadingAssessors(false)
    }
  }

  async function handleSubmit() {
    if (!selectedAssessor) {
      toast.error('Please select an assessor')
      return
    }

    setLoading(true)
    try {
      const result = await assignAssessorToEngagement({
        engagementId,
        assessorId: selectedAssessor,
        role: selectedRole,
      })

      if (result.success) {
        toast.success('Assessor assigned successfully')
        setSelectedAssessor('')
        setSelectedRole('ASSESSOR')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to assign assessor')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedAssessorData = availableAssessors.find((a) => a.id === selectedAssessor)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Team Member
          </DialogTitle>
          <DialogDescription>
            Add an assessor to this engagement. They will be able to access the package and record assessments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="assessor">Select Assessor</Label>
            {loadingAssessors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading assessors...
              </div>
            ) : availableAssessors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No available assessors. All team members are already assigned to this engagement.
              </p>
            ) : (
              <Select value={selectedAssessor} onValueChange={setSelectedAssessor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an assessor" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssessors.map((assessor) => (
                    <SelectItem key={assessor.id} value={assessor.id}>
                      <div className="flex items-center gap-2">
                        {assessor.isLeadAssessor && (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        )}
                        <span>{assessor.name}</span>
                        {assessor.jobTitle && (
                          <span className="text-muted-foreground">- {assessor.jobTitle}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedAssessorData && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="font-medium">{selectedAssessorData.name}</p>
              <p className="text-sm text-muted-foreground">{selectedAssessorData.email}</p>
              {(selectedAssessorData.ccaNumber || selectedAssessorData.ccpNumber) && (
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  {selectedAssessorData.ccaNumber && <span>CCA: {selectedAssessorData.ccaNumber}</span>}
                  {selectedAssessorData.ccpNumber && <span>CCP: {selectedAssessorData.ccpNumber}</span>}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as EngagementAssessorRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      {role.icon}
                      <div>
                        <span>{role.label}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {role.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedAssessor || availableAssessors.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
