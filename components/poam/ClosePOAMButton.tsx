'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { closePOAM } from '@/app/actions/poam';

interface ClosePOAMButtonProps {
  poamId: string;
  userId: string;
}

export function ClosePOAMButton({ poamId, userId }: ClosePOAMButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleClose = async () => {
    setLoading(true);

    try {
      const result = await closePOAM(poamId, userId);

      if (result.success) {
        toast.success('POAM closed successfully');
        router.refresh();
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to close POAM');
      }
    } catch (error) {
      console.error('Error closing POAM:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Close POAM
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close POAM</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to close this POAM? This will mark it as
            completed and set the actual completion date to today. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClose} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Close POAM
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
