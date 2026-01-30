'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Link2Off, Server, Search } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { linkSTIGTargetToAsset } from '@/app/actions/stig';
import type { STIGTargetWithStats } from '@/lib/stig/types';
// Prisma types replaced - data comes from SaaS API as JSON;

interface LinkAssetDialogProps {
  target: STIGTargetWithStats;
  assets: Asset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const assetTypeLabels: Record<string, string> = {
  SERVER: 'Server',
  WORKSTATION: 'Workstation',
  NETWORK_DEVICE: 'Network',
  MOBILE_DEVICE: 'Mobile',
  APPLICATION: 'App',
  DATABASE: 'Database',
  VOIP_DEVICE: 'VoIP',
  VIRTUAL_MACHINE: 'VM',
  OTHER: 'Other',
};

export function LinkAssetDialog({
  target,
  assets,
  open,
  onOpenChange,
}: LinkAssetDialogProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    target.asset?.id || null
  );
  const router = useRouter();

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedAssetId(target.asset?.id || null);
      setSearchTerm('');
    }
  }, [open, target.asset?.id]);

  const filteredAssets = assets.filter((asset) => {
    const search = searchTerm.toLowerCase();
    return (
      asset.name.toLowerCase().includes(search) ||
      asset.hostname?.toLowerCase().includes(search) ||
      asset.ipAddress?.toLowerCase().includes(search)
    );
  });

  const handleLink = async () => {
    setIsLinking(true);

    try {
      const result = await linkSTIGTargetToAsset(target.id, selectedAssetId);

      if (result.success) {
        toast.success(
          selectedAssetId ? 'Asset Linked' : 'Asset Unlinked',
          {
            description: selectedAssetId
              ? `STIG target ${target.hostname} linked to asset`
              : `STIG target ${target.hostname} unlinked from asset`,
          }
        );
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error('Failed to update link', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error linking asset:', error);
      toast.error('Failed to update link', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link to Asset
          </DialogTitle>
          <DialogDescription>
            Link STIG target <strong>{target.hostname}</strong> to an asset in your inventory.
            This helps track which assets have been scanned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current link status */}
          {target.asset && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Currently linked to:</span>
                <Badge variant="secondary">{target.asset.name}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAssetId(null)}
                className="text-destructive hover:text-destructive"
              >
                <Link2Off className="h-4 w-4 mr-1" />
                Unlink
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name, hostname, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Asset list */}
          <ScrollArea className="h-[280px] border rounded-lg">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Server className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No assets match your search' : 'No assets in this package'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedAssetId === asset.id
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{asset.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs py-0">
                          {assetTypeLabels[asset.assetType] || asset.assetType}
                        </Badge>
                        {asset.hostname && (
                          <span className="truncate">{asset.hostname}</span>
                        )}
                        {asset.ipAddress && (
                          <span className="font-mono">{asset.ipAddress}</span>
                        )}
                      </div>
                    </div>
                    {selectedAssetId === asset.id && (
                      <Link2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Match suggestion */}
          {!target.asset && (target.hostname || target.ipAddress) && (
            <p className="text-xs text-muted-foreground">
              Tip: Look for assets with hostname &quot;{target.hostname}&quot;
              {target.ipAddress && ` or IP "${target.ipAddress}"`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLinking}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={isLinking || selectedAssetId === (target.asset?.id || null)}
          >
            {isLinking ? (
              'Saving...'
            ) : selectedAssetId ? (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Link Asset
              </>
            ) : (
              <>
                <Link2Off className="mr-2 h-4 w-4" />
                Unlink Asset
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
