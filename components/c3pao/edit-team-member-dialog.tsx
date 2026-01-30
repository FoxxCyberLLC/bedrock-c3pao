'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { updateTeamMember, deleteTeamMember, resetTeamMemberPassword } from '@/app/actions/c3pao-dashboard'
import { Eye, EyeOff, Trash2, Key } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  ccaNumber: z.string().optional(),
  ccpNumber: z.string().optional(),
  isLeadAssessor: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
})

type FormData = z.infer<typeof formSchema>

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
}

interface EditTeamMemberDialogProps {
  member: TeamMember | null
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditTeamMemberDialog({
  member,
  currentUserId,
  open,
  onOpenChange,
  onSuccess,
}: EditTeamMemberDialogProps) {
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      jobTitle: '',
      ccaNumber: '',
      ccpNumber: '',
      isLeadAssessor: false,
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (member) {
      form.reset({
        name: member.name,
        phone: member.phone || '',
        jobTitle: member.jobTitle || '',
        ccaNumber: member.ccaNumber || '',
        ccpNumber: member.ccpNumber || '',
        isLeadAssessor: member.isLeadAssessor,
        status: member.status as 'ACTIVE' | 'INACTIVE' | 'PENDING',
      })
    }
  }, [member, form])

  async function onSubmit(data: FormData) {
    if (!member) return
    setLoading(true)
    try {
      const result = await updateTeamMember(member.id, {
        name: data.name,
        phone: data.phone || undefined,
        jobTitle: data.jobTitle || undefined,
        ccaNumber: data.ccaNumber || undefined,
        ccpNumber: data.ccpNumber || undefined,
        isLeadAssessor: data.isLeadAssessor,
        status: data.status,
      })

      if (result.success) {
        toast.success('Team member updated successfully')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to update team member')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!member) return
    setLoading(true)
    try {
      const result = await deleteTeamMember(member.id)
      if (result.success) {
        toast.success('Team member deleted successfully')
        setDeleteDialogOpen(false)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to delete team member')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!member || !newPassword) return
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const result = await resetTeamMemberPassword(member.id, newPassword)
      if (result.success) {
        toast.success('Password reset successfully')
        setResetPasswordDialogOpen(false)
        setNewPassword('')
      } else {
        toast.error(result.error || 'Failed to reset password')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isSelf = member?.id === currentUserId

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {member?.name}&apos;s information
            </DialogDescription>
          </DialogHeader>

          {member && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <strong>Email:</strong> {member.email}
                  <p className="text-xs mt-1">Email cannot be changed</p>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Assessor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ccaNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CCA Number</FormLabel>
                        <FormControl>
                          <Input placeholder="CCA-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ccpNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CCP Number</FormLabel>
                        <FormControl>
                          <Input placeholder="CCP-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isLeadAssessor"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Lead Assessor</FormLabel>
                        <FormDescription>
                          Lead assessors can manage team members and record assessment results
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResetPasswordDialogOpen(true)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                  {!isSelf && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {member?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {member?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResetPasswordDialogOpen(false)
                  setNewPassword('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={loading || !newPassword}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
