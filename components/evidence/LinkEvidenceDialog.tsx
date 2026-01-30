'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  linkEvidenceToRequirement,
  unlinkEvidenceFromRequirement,
  getRequirementStatusesByPackage,
} from '@/app/actions/evidence';
import { Evidence, RequirementStatus, Requirement, RequirementFamily } from '@/lib/prisma-types';

type EvidenceWithRelations = Evidence & {
  requirementStatuses: (RequirementStatus & {
    requirement: Requirement & {
      family: RequirementFamily;
    };
  })[];
};

interface LinkEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: EvidenceWithRelations;
  packageId: string;
}

export function LinkEvidenceDialog({
  open,
  onOpenChange,
  evidence,
  packageId,
}: LinkEvidenceDialogProps) {
  const [requirements, setRequirements] = useState<
    (RequirementStatus & {
      requirement: Requirement & {
        family: RequirementFamily;
      };
    })[]
  >([]);
  const [linkedRequirementIds, setLinkedRequirementIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const loadRequirements = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all requirements for the package using server action
      const result = await getRequirementStatusesByPackage(packageId);
      if (result.success && result.data) {
        setRequirements(result.data);
      } else {
        toast.error('Failed to load requirements', {
          description: result.error || 'Could not fetch requirements',
        });
      }
    } catch (error) {
      console.error('Error loading requirements:', error);
      toast.error('Failed to load requirements');
    } finally {
      setIsLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (open) {
      void loadRequirements();
      // Initialize linked requirements
      setLinkedRequirementIds(
        new Set(evidence.requirementStatuses.map((rs) => rs.id))
      );
    }
  }, [open, evidence, loadRequirements]);

  const handleToggleRequirement = (requirementStatusId: string) => {
    const newLinked = new Set(linkedRequirementIds);
    if (newLinked.has(requirementStatusId)) {
      newLinked.delete(requirementStatusId);
    } else {
      newLinked.add(requirementStatusId);
    }
    setLinkedRequirementIds(newLinked);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const originalLinked = new Set(evidence.requirementStatuses.map((rs) => rs.id));

      // Find requirements to link (newly checked)
      const toLink = Array.from(linkedRequirementIds).filter(
        (id) => !originalLinked.has(id)
      );

      // Find requirements to unlink (newly unchecked)
      const toUnlink = Array.from(originalLinked).filter(
        (id) => !linkedRequirementIds.has(id)
      );

      // Execute link operations
      for (const reqStatusId of toLink) {
        await linkEvidenceToRequirement(evidence.id, reqStatusId);
      }

      // Execute unlink operations
      for (const reqStatusId of toUnlink) {
        await unlinkEvidenceFromRequirement(evidence.id, reqStatusId);
      }

      toast.success('Links Updated', {
        description: `Evidence successfully ${toLink.length > 0 ? 'linked to' : 'unlinked from'} controls.`,
      });

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error saving links:', error);
      toast.error('Failed to Update Links', {
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Group requirements by family
  const requirementsByFamily = requirements.reduce((acc, rs) => {
    const familyCode = rs.requirement.family.code;
    if (!acc[familyCode]) {
      acc[familyCode] = {
        family: rs.requirement.family,
        requirements: [],
      };
    }
    acc[familyCode].requirements.push(rs);
    return acc;
  }, {} as Record<string, { family: RequirementFamily; requirements: typeof requirements }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Link Evidence to Controls</DialogTitle>
          <DialogDescription>
            Select which controls this evidence supports: <strong>{evidence.fileName}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] py-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading requirements...
            </div>
          ) : Object.keys(requirementsByFamily).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No requirements found for this package
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(requirementsByFamily).map(({ family, requirements: familyReqs }) => (
                <div key={family.code} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{family.code}</Badge>
                    <span className="text-sm font-medium">{family.name}</span>
                  </div>
                  <div className="ml-4 space-y-2">
                    {familyReqs.map((rs) => (
                      <div key={rs.id} className="flex items-start space-x-3 py-2">
                        <Checkbox
                          id={rs.id}
                          checked={linkedRequirementIds.has(rs.id)}
                          onCheckedChange={() => handleToggleRequirement(rs.id)}
                        />
                        <label
                          htmlFor={rs.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-primary">{rs.requirement.requirementId}</span>
                            {linkedRequirementIds.has(rs.id) && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {rs.requirement.title}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <LinkIcon className="mr-2 h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Save Links
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
