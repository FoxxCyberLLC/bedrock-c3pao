'use server'

/**
 * Server actions for outside-OSC engagements (local-only c3pao engagements).
 *
 * Authorization:
 *   - Read actions: any authenticated assessor
 *   - Write actions: lead assessor of the outside engagement OR local admin
 *
 * All input is Zod-validated at the action boundary; never trust caller payloads.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAuth, requireOutsideLeadAssessor } from '@/lib/auth'
import {
  insertOutsideEngagement,
  listOutsideEngagements as dbList,
  getOutsideEngagementById as dbGet,
  updateOutsideEngagement as dbUpdate,
  deleteOutsideEngagement as dbDelete,
  type OutsideEngagementInput,
} from '@/lib/db-outside-engagement'
import type { OutsideEngagement } from '@/lib/outside-engagement-types'

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

const TargetLevelSchema = z.enum(['L1', 'L2', 'L3'])
const StatusSchema = z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')

const CreateInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    clientName: z.string().trim().min(1, 'Client name is required').max(200),
    clientPocName: z.string().trim().min(1, 'POC name is required').max(100),
    clientPocEmail: z.string().email('Valid email required').max(200),
    scope: z.string().max(2000).nullable(),
    targetLevel: TargetLevelSchema,
    leadAssessorId: z.string().min(1, 'Lead assessor required'),
    leadAssessorName: z.string().min(1),
    scheduledStartDate: DateStringSchema,
    scheduledEndDate: DateStringSchema,
  })
  .refine((v) => v.scheduledStartDate <= v.scheduledEndDate, {
    message: 'End date must be on or after start date',
    path: ['scheduledEndDate'],
  })

const UpdateInputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  clientName: z.string().trim().min(1).max(200).optional(),
  clientPocName: z.string().trim().min(1).max(100).optional(),
  clientPocEmail: z.string().email().max(200).optional(),
  scope: z.string().max(2000).nullable().optional(),
  targetLevel: TargetLevelSchema.optional(),
  status: StatusSchema.optional(),
  leadAssessorId: z.string().min(1).optional(),
  leadAssessorName: z.string().min(1).optional(),
  scheduledStartDate: DateStringSchema.optional(),
  scheduledEndDate: DateStringSchema.optional(),
})

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input'
}

function errorEnvelope<T>(err: unknown, fallback: string): ActionResult<T> {
  return {
    success: false,
    error: err instanceof Error ? err.message : fallback,
  }
}

export async function createOutsideEngagement(
  input: unknown,
): Promise<ActionResult<OutsideEngagement>> {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = CreateInputSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) }
  }

  try {
    const dbInput: OutsideEngagementInput = {
      ...parsed.data,
      createdBy: session.c3paoUser.id,
    }
    const eng = await insertOutsideEngagement(dbInput)
    revalidatePath('/engagements')
    return { success: true, data: eng }
  } catch (err) {
    return errorEnvelope(err, 'Failed to create outside engagement')
  }
}

export async function listOutsideEngagementsAction(): Promise<
  ActionResult<OutsideEngagement[]>
> {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const list = await dbList()
    return { success: true, data: list }
  } catch (err) {
    return errorEnvelope(err, 'Failed to list outside engagements')
  }
}

export async function getOutsideEngagementByIdAction(
  id: string,
): Promise<ActionResult<OutsideEngagement | null>> {
  const session = await requireAuth()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const eng = await dbGet(id)
    return { success: true, data: eng }
  } catch (err) {
    return errorEnvelope(err, 'Failed to fetch outside engagement')
  }
}

export async function updateOutsideEngagement(
  id: string,
  patch: unknown,
): Promise<ActionResult<OutsideEngagement>> {
  const auth = await requireOutsideLeadAssessor(id)
  if (!auth.session) return { success: false, error: 'Unauthorized' }
  if (!auth.isLead) {
    return { success: false, error: 'Forbidden — lead assessor only' }
  }

  const parsed = UpdateInputSchema.safeParse(patch)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) }
  }

  try {
    const eng = await dbUpdate(id, parsed.data)
    if (!eng) return { success: false, error: 'Outside engagement not found' }
    revalidatePath(`/engagements/${id}`)
    revalidatePath('/engagements')
    return { success: true, data: eng }
  } catch (err) {
    return errorEnvelope(err, 'Failed to update outside engagement')
  }
}

export async function deleteOutsideEngagement(
  id: string,
): Promise<ActionResult<true>> {
  const auth = await requireOutsideLeadAssessor(id)
  if (!auth.session) return { success: false, error: 'Unauthorized' }
  if (!auth.isLead) {
    return { success: false, error: 'Forbidden — lead assessor only' }
  }

  try {
    const deleted = await dbDelete(id)
    if (!deleted) return { success: false, error: 'Outside engagement not found' }
    revalidatePath('/engagements')
    return { success: true, data: true }
  } catch (err) {
    return errorEnvelope(err, 'Failed to delete outside engagement')
  }
}
