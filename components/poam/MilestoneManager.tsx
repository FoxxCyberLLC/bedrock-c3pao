'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { POAMMilestone } from '@/lib/types/poam';
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  toggleMilestoneCompletion,
} from '@/app/actions/milestone';

interface MilestoneManagerProps {
  poamId: string;
  milestones: POAMMilestone[];
  readOnly?: boolean;
  maxDueDate?: Date;
}

export function MilestoneManager({
  poamId,
  milestones: initialMilestones,
  readOnly = false,
  maxDueDate,
}: MilestoneManagerProps) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<POAMMilestone | null>(
    null
  );
  const [deletingMilestone, setDeletingMilestone] = useState<POAMMilestone | null>(
    null
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Milestones</h3>
          <p className="text-sm text-muted-foreground">
            Track progress with specific milestones
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No milestones yet. Add milestones to track progress on this POAM.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              readOnly={readOnly}
              onToggle={async () => {
                const result = await toggleMilestoneCompletion(milestone.id);
                if (result.success && result.data) {
                  setMilestones((prev) =>
                    prev.map((m) => (m.id === milestone.id ? result.data! : m))
                  );
                  toast.success(
                    result.data.completed
                      ? 'Milestone completed'
                      : 'Milestone reopened'
                  );
                } else {
                  toast.error(result.error || 'Failed to update milestone');
                }
              }}
              onEdit={() => setEditingMilestone(milestone)}
              onDelete={() => setDeletingMilestone(milestone)}
            />
          ))}
        </div>
      )}

      {/* Add Milestone Dialog */}
      <MilestoneDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        poamId={poamId}
        maxDueDate={maxDueDate}
        onSuccess={(newMilestone) => {
          setMilestones((prev) => [...prev, newMilestone]);
          setShowAddDialog(false);
          toast.success('Milestone added');
        }}
      />

      {/* Edit Milestone Dialog */}
      {editingMilestone && (
        <MilestoneDialog
          open={!!editingMilestone}
          onOpenChange={(open) => !open && setEditingMilestone(null)}
          poamId={poamId}
          milestone={editingMilestone}
          maxDueDate={maxDueDate}
          onSuccess={(updatedMilestone) => {
            setMilestones((prev) =>
              prev.map((m) =>
                m.id === updatedMilestone.id ? updatedMilestone : m
              )
            );
            setEditingMilestone(null);
            toast.success('Milestone updated');
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingMilestone}
        onOpenChange={(open) => !open && setDeletingMilestone(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milestone? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingMilestone) return;
                const result = await deleteMilestone(deletingMilestone.id);
                if (result.success) {
                  setMilestones((prev) =>
                    prev.filter((m) => m.id !== deletingMilestone.id)
                  );
                  toast.success('Milestone deleted');
                } else {
                  toast.error(result.error || 'Failed to delete milestone');
                }
                setDeletingMilestone(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface MilestoneItemProps {
  milestone: POAMMilestone;
  readOnly: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MilestoneItem({
  milestone,
  readOnly,
  onToggle,
  onEdit,
  onDelete,
}: MilestoneItemProps) {
  const isPastDue = new Date(milestone.dueDate) < new Date() && !milestone.completed;

  return (
    <Card
      className={cn(
        'p-4',
        milestone.completed && 'bg-muted/50',
        isPastDue && 'border-red-500'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle (future feature) */}
        {!readOnly && (
          <div className="mt-1 cursor-grab">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Checkbox */}
        <div className="mt-1">
          <Checkbox
            checked={milestone.completed}
            onCheckedChange={onToggle}
            disabled={readOnly}
          />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <p
            className={cn(
              'font-medium',
              milestone.completed && 'line-through text-muted-foreground'
            )}
          >
            {milestone.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}</span>
            {milestone.completed && milestone.completedDate && (
              <span className="text-green-600">
                ✓ Completed {format(new Date(milestone.completedDate), 'MMM d, yyyy')}
              </span>
            )}
            {isPastDue && (
              <span className="text-red-600 font-medium">Overdue</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poamId: string;
  milestone?: POAMMilestone;
  maxDueDate?: Date;
  onSuccess: (milestone: POAMMilestone) => void;
}

function MilestoneDialog({
  open,
  onOpenChange,
  poamId,
  milestone,
  maxDueDate,
  onSuccess,
}: MilestoneDialogProps) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(milestone?.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    milestone?.dueDate ? new Date(milestone.dueDate) : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) {
      toast.error('Due date is required');
      return;
    }

    setLoading(true);

    try {
      if (milestone) {
        // Update existing milestone
        const result = await updateMilestone({
          id: milestone.id,
          description,
          dueDate,
        });

        if (result.success && result.data) {
          onSuccess(result.data);
        } else {
          toast.error(result.error || 'Failed to update milestone');
        }
      } else {
        // Create new milestone
        const result = await createMilestone({
          poamId,
          description,
          dueDate,
        });

        if (result.success && result.data) {
          onSuccess(result.data);
          setDescription('');
          setDueDate(undefined);
        } else {
          toast.error(result.error || 'Failed to create milestone');
        }
      }
    } catch (error) {
      console.error('Error saving milestone:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {milestone ? 'Edit Milestone' : 'Add Milestone'}
          </DialogTitle>
          <DialogDescription>
            {milestone
              ? 'Update the milestone details'
              : 'Create a new milestone to track progress'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be accomplished?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              Due Date <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              date={dueDate}
              onSelect={setDueDate}
              disabled={(date) => date < new Date() || (maxDueDate ? date > maxDueDate : false)}
              fromDate={new Date()}
              toDate={maxDueDate}
              placeholder="Pick a date"
            />
            {maxDueDate && (
              <p className="text-sm text-muted-foreground">
                Cannot exceed POAM completion date ({maxDueDate.toLocaleDateString()})
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {milestone ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
