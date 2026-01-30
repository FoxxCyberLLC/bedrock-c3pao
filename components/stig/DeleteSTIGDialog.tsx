'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { deleteSTIGTarget, deleteSTIGImport, deleteSTIGChecklist } from '@/app/actions/stig';
import type { STIGTargetWithStats, STIGImport, STIGChecklistWithCounts } from '@/lib/stig/types';

interface DeleteSTIGTargetDialogProps {
  target: STIGTargetWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSTIGTargetDialog({
  target,
  open,
  onOpenChange,
}: DeleteSTIGTargetDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSTIGTarget(target.id);

      if (result.success) {
        toast.success('Target Deleted', {
          description: `${target.hostname} and all associated STIGs have been deleted.`,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error('Delete Failed', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error deleting target:', error);
      toast.error('Delete Failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete STIG Target
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete the target <strong>{target.hostname}</strong>?
            </p>
            <p>
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>{target._count?.checklists || target.checklists?.length || 0} STIG checklists</li>
              <li>{target.totalRules} security rules and findings</li>
            </ul>
            <p className="font-medium text-destructive">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Target
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteSTIGImportDialogProps {
  import_: STIGImport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSTIGImportDialog({
  import_,
  open,
  onOpenChange,
}: DeleteSTIGImportDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSTIGImport(import_.id);

      if (result.success) {
        toast.success('Import Deleted', {
          description: `Import "${import_.fileName}" has been deleted.`,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error('Delete Failed', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error deleting import:', error);
      toast.error('Delete Failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Import
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete the import <strong>{import_.fileName}</strong>?
            </p>
            <p>
              This will delete {import_.stigsImported} STIGs and {import_.rulesImported} rules
              that were imported from this file.
            </p>
            <p className="font-medium text-destructive">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Import
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteSTIGChecklistDialogProps {
  checklist: STIGChecklistWithCounts;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteSTIGChecklistDialog({
  checklist,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSTIGChecklistDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSTIGChecklist(checklist.id);

      if (result.success) {
        toast.success('Checklist Deleted', {
          description: `${checklist.displayName} has been deleted.`,
        });
        onOpenChange(false);
        if (onDeleted) {
          onDeleted();
        }
        router.refresh();
      } else {
        toast.error('Delete Failed', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast.error('Delete Failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete STIG Checklist
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{checklist.displayName}</strong>?
            </p>
            <p>
              This will permanently delete {checklist.totalRules} security rules and all finding data.
            </p>
            <p className="font-medium text-destructive">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Checklist
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
