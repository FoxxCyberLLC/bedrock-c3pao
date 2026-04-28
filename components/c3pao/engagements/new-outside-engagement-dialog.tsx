'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createOutsideEngagement } from '@/app/actions/c3pao-outside-engagement'

const FormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    clientName: z.string().trim().min(1, 'Client name is required').max(200),
    clientPocName: z.string().trim().min(1, 'POC name is required').max(100),
    clientPocEmail: z.string().email('Valid email required').max(200),
    scope: z.string().max(2000).optional(),
    targetLevel: z.enum(['L1', 'L2', 'L3']),
    leadAssessorId: z.string().min(1, 'Lead assessor required'),
    leadAssessorName: z.string().min(1),
    scheduledStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    scheduledEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  })
  .refine((v) => v.scheduledStartDate <= v.scheduledEndDate, {
    message: 'End date must be on or after start date',
    path: ['scheduledEndDate'],
  })

type FormValues = z.infer<typeof FormSchema>

interface LeadOption {
  id: string
  name: string
}

interface NewOutsideEngagementDialogProps {
  leadOptions: ReadonlyArray<LeadOption>
}

export function NewOutsideEngagementDialog({
  leadOptions,
}: NewOutsideEngagementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      clientName: '',
      clientPocName: '',
      clientPocEmail: '',
      scope: '',
      targetLevel: 'L2',
      leadAssessorId: '',
      leadAssessorName: '',
      scheduledStartDate: '',
      scheduledEndDate: '',
    },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const result = await createOutsideEngagement({
        ...values,
        scope: values.scope?.length ? values.scope : null,
      })
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Failed to create outside engagement')
        return
      }
      toast.success('Outside engagement created')
      setOpen(false)
      form.reset()
      router.push(`/engagements/${result.data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  function handleLeadChange(id: string) {
    const lead = leadOptions.find((opt) => opt.id === id)
    form.setValue('leadAssessorId', id, { shouldValidate: true })
    form.setValue('leadAssessorName', lead?.name ?? '', { shouldValidate: true })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Outside Engagement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Outside Engagement</DialogTitle>
          <DialogDescription>
            Local-only CMMC engagement. Stored in c3pao Postgres; never synced
            to bedrock-cmmc.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme L2 Outside" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientPocName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POC name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientPocEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POC email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@acme.example" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled end</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target level</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="L1">CMMC Level 1</SelectItem>
                        <SelectItem value="L2">CMMC Level 2</SelectItem>
                        <SelectItem value="L3">CMMC Level 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leadAssessorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead assessor</FormLabel>
                    <Select value={field.value} onValueChange={handleLeadChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leadOptions.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No team members available — create one in Team first.
                          </div>
                        ) : (
                          leadOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Describe what's being assessed..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
