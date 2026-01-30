'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createAssetFromSTIGTarget } from '@/app/actions/stig';
import type { STIGTargetWithStats } from '@/lib/stig/types';

interface CreateAssetFromTargetDialogProps {
  target: STIGTargetWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const assetTypes = [
  { value: 'SERVER', label: 'Server' },
  { value: 'WORKSTATION', label: 'Workstation' },
  { value: 'NETWORK_DEVICE', label: 'Network Device' },
  { value: 'MOBILE_DEVICE', label: 'Mobile Device' },
  { value: 'APPLICATION', label: 'Application' },
  { value: 'DATABASE', label: 'Database' },
  { value: 'VOIP_DEVICE', label: 'VoIP Device' },
  { value: 'VIRTUAL_MACHINE', label: 'Virtual Machine' },
  { value: 'OTHER', label: 'Other' },
] as const;

const assetCategories = [
  { value: 'IN_SCOPE', label: 'In Scope' },
  { value: 'OUT_OF_SCOPE', label: 'Out of Scope' },
  { value: 'SPECIALIZED_IOT', label: 'IoT Device' },
  { value: 'SPECIALIZED_IIOT', label: 'IIoT Device' },
  { value: 'SPECIALIZED_OT', label: 'OT Device' },
  { value: 'SPECIALIZED_GFE', label: 'GFE' },
  { value: 'SPECIALIZED_RIS', label: 'RIS' },
  { value: 'SPECIALIZED_TEST', label: 'Test/Dev' },
] as const;

type AssetType = typeof assetTypes[number]['value'];
type AssetCategory = typeof assetCategories[number]['value'];

export function CreateAssetFromTargetDialog({
  target,
  open,
  onOpenChange,
}: CreateAssetFromTargetDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('SERVER');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('IN_SCOPE');
  const [description, setDescription] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('');
  const router = useRouter();

  // Initialize form with target data when dialog opens
  useEffect(() => {
    if (open) {
      setName(target.hostname);
      setDescription(`Created from STIG scan of ${target.hostname}`);
      setOperatingSystem(target.targetType || '');

      // Guess asset type from target type
      const targetTypeUpper = (target.targetType || '').toUpperCase();
      if (targetTypeUpper.includes('WORKSTATION') || targetTypeUpper.includes('DESKTOP')) {
        setAssetType('WORKSTATION');
      } else if (targetTypeUpper.includes('NETWORK') || targetTypeUpper.includes('ROUTER') || targetTypeUpper.includes('SWITCH') || targetTypeUpper.includes('FIREWALL')) {
        setAssetType('NETWORK_DEVICE');
      } else if (targetTypeUpper.includes('MOBILE')) {
        setAssetType('MOBILE_DEVICE');
      } else if (targetTypeUpper.includes('DATABASE') || targetTypeUpper.includes('SQL')) {
        setAssetType('DATABASE');
      } else if (targetTypeUpper.includes('VIRTUAL') || targetTypeUpper.includes('VM')) {
        setAssetType('VIRTUAL_MACHINE');
      } else {
        setAssetType('SERVER');
      }
    }
  }, [open, target]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setIsCreating(true);

    try {
      const result = await createAssetFromSTIGTarget(target.id, {
        name: name.trim(),
        assetType,
        assetCategory,
        description: description.trim() || undefined,
        operatingSystem: operatingSystem.trim() || undefined,
      });

      if (result.success && result.data) {
        toast.success('Asset Created', {
          description: `${result.data.assetName} has been created and linked to this STIG target.`,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error('Failed to create asset', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error creating asset:', error);
      toast.error('Failed to create asset', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Create Asset from STIG Target
          </DialogTitle>
          <DialogDescription>
            Create a new asset in your inventory using data from the STIG scan.
            The asset will be automatically linked to this target.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pre-filled data from target */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Data from STIG scan:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Hostname:</span>{' '}
                <span className="font-mono">{target.hostname}</span>
              </div>
              {target.ipAddress && (
                <div>
                  <span className="text-muted-foreground">IP:</span>{' '}
                  <span className="font-mono">{target.ipAddress}</span>
                </div>
              )}
              {target.macAddress && (
                <div>
                  <span className="text-muted-foreground">MAC:</span>{' '}
                  <span className="font-mono">{target.macAddress}</span>
                </div>
              )}
              {target.targetType && (
                <div>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span>{target.targetType}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline">{target.checklists.length} STIGs</Badge>
              <Badge variant="outline">{target.totalRules} rules</Badge>
              <Badge
                variant={target.compliancePercentage >= 80 ? 'default' : target.compliancePercentage >= 60 ? 'secondary' : 'destructive'}
              >
                {target.compliancePercentage}% compliant
              </Badge>
            </div>
          </div>

          {/* Asset Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Asset Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter asset name"
            />
          </div>

          {/* Asset Type and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={assetCategory} onValueChange={(v) => setAssetCategory(v as AssetCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Operating System */}
          <div className="space-y-2">
            <Label htmlFor="os">Operating System</Label>
            <Input
              id="os"
              value={operatingSystem}
              onChange={(e) => setOperatingSystem(e.target.value)}
              placeholder="e.g., Windows Server 2022, RHEL 8"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this asset"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Asset
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
