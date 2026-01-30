'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { deleteEvidence } from '@/app/actions/evidence';
// Prisma types replaced - data comes from SaaS API as JSON;

type EvidenceWithRelations = Evidence & {
  requirementStatuses: RequirementStatus[];
};

interface DeleteEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: EvidenceWithRelations;
}

export function DeleteEvidenceDialog({
  open,
  onOpenChange,
  evidence,
}: DeleteEvidenceDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteEvidence(evidence.id);

      if (result.success) {
        toast.success('Evidence Deleted', {
          description: `${evidence.fileName} has been permanently deleted.`,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error('Delete Failed', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error deleting evidence:', error);
      toast.error('Delete Failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete Evidence</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this evidence file? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="font-medium">{evidence.fileName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Uploaded on {new Date(evidence.uploadedAt).toLocaleDateString()}
            </p>
          </div>

          {evidence.requirementStatuses.length > 0 && (
            <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This evidence is currently linked to{' '}
                <strong>{evidence.requirementStatuses.length}</strong>{' '}
                {evidence.requirementStatuses.length === 1 ? 'control' : 'controls'}.
                Deleting it will remove these links.
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The file will be permanently deleted from storage and cannot be recovered.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Evidence
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
