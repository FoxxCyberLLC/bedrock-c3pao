'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { addInstanceUser } from '@/app/actions/instance-org'

interface AddAssessorDialogProps {
  c3paoName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddAssessorDialog({
  c3paoName,
  open,
  onOpenChange,
  onSuccess,
}: AddAssessorDialogProps) {
  const [loading, setLoading] = useState(false)
  const [isLeadAssessor, setIsLeadAssessor] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('isLeadAssessor', isLeadAssessor.toString())

    try {
      const result = await addInstanceUser(formData)

      if (result.success) {
        toast.success('Assessor added successfully')
        onOpenChange(false)
        onSuccess?.()
        setIsLeadAssessor(false)
      } else {
        toast.error(result.error || 'Failed to add assessor')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Assessor</DialogTitle>
          <DialogDescription>Add a new assessor to {c3paoName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" required placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="john@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+1 (555) 123-4567" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              name="jobTitle"
              placeholder="e.g., Lead Assessor, Provisional Assessor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ccaNumber">CCA Number</Label>
              <Input id="ccaNumber" name="ccaNumber" placeholder="Certified CMMC Assessor #" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccpNumber">CCP Number</Label>
              <Input id="ccpNumber" name="ccpNumber" placeholder="Certified CMMC Professional #" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isLeadAssessor"
              checked={isLeadAssessor}
              onCheckedChange={(checked) => setIsLeadAssessor(checked as boolean)}
            />
            <Label htmlFor="isLeadAssessor" className="font-normal">
              Can lead assessments (Lead Assessor)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Assessor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
