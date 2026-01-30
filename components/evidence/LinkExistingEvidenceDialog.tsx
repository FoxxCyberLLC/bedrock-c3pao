'use client';

import { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  getEvidenceByPackage,
  linkEvidenceToRequirement,
  unlinkEvidenceFromRequirement,
} from '@/app/actions/evidence';
// Prisma types replaced - data comes from SaaS API as JSON;

interface EvidenceWithRelations extends Evidence {
  requirementStatuses?: RequirementStatus[];
}

interface LinkExistingEvidenceDialogProps {
  packageId: string;
  requirementStatusId: string;
  requirementTitle: string;
  onLinkComplete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkExistingEvidenceDialog({
  packageId,
  requirementStatusId,
  requirementTitle,
  onLinkComplete,
  open,
  onOpenChange,
}: LinkExistingEvidenceDialogProps) {
  const [evidence, setEvidence] = useState<EvidenceWithRelations[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadEvidence();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packageId]);

  const loadEvidence = async () => {
    setIsLoading(true);
    try {
      const result = await getEvidenceByPackage(packageId);
      if (result.success && result.data) {
        setEvidence(result.data as EvidenceWithRelations[]);

        // Pre-select evidence that's already linked to this requirement
        const alreadyLinked = new Set<string>();
        result.data.forEach((ev: EvidenceWithRelations) => {
          if (ev.requirementStatuses?.some(rs => rs.id === requirementStatusId)) {
            alreadyLinked.add(ev.id);
          }
        });
        setSelectedIds(alreadyLinked);
      } else {
        toast.error('Failed to load evidence', {
          description: result.error || 'Could not fetch evidence files',
        });
      }
    } catch (error) {
      console.error('Error loading evidence:', error);
      toast.error('Failed to load evidence');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (evidenceId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(evidenceId)) {
      newSelected.delete(evidenceId);
    } else {
      newSelected.add(evidenceId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Determine what needs to be linked and unlinked
      const currentlyLinked = new Set<string>();
      evidence.forEach(ev => {
        if (ev.requirementStatuses?.some(rs => rs.id === requirementStatusId)) {
          currentlyLinked.add(ev.id);
        }
      });

      const toLink = Array.from(selectedIds).filter(id => !currentlyLinked.has(id));
      const toUnlink = Array.from(currentlyLinked).filter(id => !selectedIds.has(id));

      // Execute links
      for (const evidenceId of toLink) {
        const result = await linkEvidenceToRequirement(evidenceId, requirementStatusId);
        if (!result.success) {
          toast.error(`Failed to link evidence`, {
            description: result.error,
          });
          setIsSaving(false);
          return;
        }
      }

      // Execute unlinks
      for (const evidenceId of toUnlink) {
        const result = await unlinkEvidenceFromRequirement(evidenceId, requirementStatusId);
        if (!result.success) {
          toast.error(`Failed to unlink evidence`, {
            description: result.error,
          });
          setIsSaving(false);
          return;
        }
      }

      toast.success('Evidence links updated', {
        description: `${toLink.length} linked, ${toUnlink.length} unlinked`,
      });

      onOpenChange(false);
      if (onLinkComplete) {
        onLinkComplete();
      }
    } catch (error) {
      console.error('Error saving evidence links:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Link Existing Evidence</DialogTitle>
          <DialogDescription>
            Select evidence files to link to <strong>{requirementTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading evidence...</p>
            </div>
          </div>
        ) : evidence.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No Evidence Files</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload evidence files to this ATO package first before linking them to requirements.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-2">
                {evidence.map((ev) => {
                  const isSelected = selectedIds.has(ev.id);
                  const linkedCount = ev.requirementStatuses?.length || 0;

                  return (
                    <div
                      key={ev.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                      }`}
                      onClick={() => toggleSelection(ev.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(ev.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm truncate">{ev.fileName}</span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Uploaded {new Date(ev.uploadedAt).toLocaleDateString()}
                          </span>
                          {linkedCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Linked to {linkedCount} requirement{linkedCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <LinkIcon className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : `Link ${selectedIds.size} File${selectedIds.size !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}