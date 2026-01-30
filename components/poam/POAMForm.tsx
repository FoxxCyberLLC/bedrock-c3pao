'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import type { CreatePOAMInput, POAMWithRelations } from '@/lib/types/poam';
import { createPOAM, updatePOAM } from '@/app/actions/poam';
import { getDaysToRemediate } from '@/lib/utils/poam-rules';

interface POAMFormProps {
  atoPackageId: string;
  requirements: Array<{
    id: string;
    requirementId: string;
    title: string;
    familyCode: string;
  }>;
  existingPOAM?: POAMWithRelations;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function POAMForm({
  atoPackageId,
  requirements,
  existingPOAM,
  userId,
  onSuccess,
  onCancel,
}: POAMFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [type, setType] = useState<'ASSESSMENT' | 'OPERATIONAL'>(
    existingPOAM?.type || 'OPERATIONAL'
  );
  const [requirementId, setRequirementId] = useState(
    existingPOAM?.requirementId || ''
  );
  const [title, setTitle] = useState(existingPOAM?.title || '');
  const [description, setDescription] = useState(
    existingPOAM?.description || ''
  );
  const [riskLevel, setRiskLevel] = useState<
    'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
  >(existingPOAM?.riskLevel || 'MODERATE');
  const [remediationPlan, setRemediationPlan] = useState(
    existingPOAM?.remediationPlan || ''
  );
  const [scheduledCompletionDate, setScheduledCompletionDate] = useState<
    Date | undefined
  >(
    existingPOAM?.scheduledCompletionDate
      ? new Date(existingPOAM.scheduledCompletionDate)
      : undefined
  );

  // Calculate maximum allowed date based on risk level
  const maxAllowedDays = getDaysToRemediate(riskLevel);
  const maxAllowedDate = new Date();
  maxAllowedDate.setDate(maxAllowedDate.getDate() + maxAllowedDays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (existingPOAM) {
        // Update existing POAM
        const result = await updatePOAM({
          id: existingPOAM.id,
          title,
          description,
          riskLevel,
          remediationPlan,
          scheduledCompletionDate,
          updatedBy: userId,
        });

        if (result.success) {
          toast.success('POAM updated successfully');
          if (onSuccess) onSuccess();
          else router.push(`/cmmc/poams/${existingPOAM.id}`);
        } else {
          toast.error(result.error || 'Failed to update POAM');
        }
      } else {
        // Create new POAM
        if (!requirementId) {
          toast.error('Please select a requirement');
          setLoading(false);
          return;
        }

        if (!scheduledCompletionDate) {
          toast.error('Scheduled completion date is required');
          setLoading(false);
          return;
        }

        const input: CreatePOAMInput = {
          type,
          requirementIds: [requirementId],
          atoPackageId,
          title,
          description,
          riskLevel,
          remediationPlan,
          scheduledCompletionDate,
          createdBy: userId,
        };

        const result = await createPOAM(input);

        if (result.success) {
          toast.success('POAM created successfully');
          if (onSuccess) onSuccess();
          else router.push(`/cmmc/poams/${result.data?.id}`);
        } else {
          toast.error(result.error || 'Failed to create POAM');
        }
      }
    } catch (error) {
      console.error('Error submitting POAM:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* POAM Type */}
      {!existingPOAM && (
        <div className="space-y-2">
          <Label htmlFor="type">
            POAM Type <span className="text-red-500">*</span>
          </Label>
          <Select value={type} onValueChange={(v: 'OPERATIONAL' | 'ASSESSMENT') => setType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPERATIONAL">
                Operational (Ongoing Deficiency)
              </SelectItem>
              <SelectItem value="ASSESSMENT">
                Assessment (Post-Assessment Finding)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {type === 'OPERATIONAL'
              ? 'Track temporary deficiencies during operations'
              : 'Track findings from third-party assessments'}
          </p>
        </div>
      )}

      {/* Requirement Selection */}
      {!existingPOAM && (
        <div className="space-y-2">
          <Label htmlFor="requirement">
            Related Requirement <span className="text-red-500">*</span>
          </Label>
          <Select
            value={requirementId}
            onValueChange={setRequirementId}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a requirement" />
            </SelectTrigger>
            <SelectContent>
              {requirements.map((req) => (
                <SelectItem key={req.id} value={req.id}>
                  {req.requirementId} - {req.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title of the issue"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed description of the deficiency"
          rows={4}
          required
        />
      </div>

      {/* Risk Level */}
      <div className="space-y-2">
        <Label htmlFor="riskLevel">
          Risk Level <span className="text-red-500">*</span>
        </Label>
        <Select
          value={riskLevel}
          onValueChange={(v: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW') => setRiskLevel(v)}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CRITICAL">
              Critical (30 days to remediate)
            </SelectItem>
            <SelectItem value="HIGH">High (30 days to remediate)</SelectItem>
            <SelectItem value="MODERATE">
              Moderate (90 days to remediate)
            </SelectItem>
            <SelectItem value="LOW">Low (180 days to remediate)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Remediation deadline: {maxAllowedDays} days from creation
        </p>
      </div>

      {/* Remediation Plan */}
      <div className="space-y-2">
        <Label htmlFor="remediationPlan">
          Remediation Plan <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="remediationPlan"
          value={remediationPlan}
          onChange={(e) => setRemediationPlan(e.target.value)}
          placeholder="How will this deficiency be addressed?"
          rows={6}
          required
        />
        <p className="text-sm text-muted-foreground">
          Describe the specific steps and actions to remediate this finding
        </p>
      </div>

      {/* Scheduled Completion Date */}
      <div className="space-y-2">
        <Label>
          Scheduled Completion Date <span className="text-red-500">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !scheduledCompletionDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {scheduledCompletionDate ? (
                format(scheduledCompletionDate, 'PPP')
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={scheduledCompletionDate}
              onSelect={setScheduledCompletionDate}
              disabled={(date) => date < new Date() || date > maxAllowedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <p className="text-sm text-muted-foreground">
          Must be within {maxAllowedDays} days (by{' '}
          {format(maxAllowedDate, 'MMM d, yyyy')})
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingPOAM ? 'Update POAM' : 'Create POAM'}
        </Button>
      </div>
    </form>
  );
}
