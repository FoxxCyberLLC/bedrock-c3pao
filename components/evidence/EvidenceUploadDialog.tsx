'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { uploadEvidence } from '@/app/actions/evidence';

interface EvidenceUploadDialogProps {
  packageId: string;
  requirementId?: string; // Optional - if uploading from control assessment
  onUploadComplete?: () => void;
  triggerButton?: React.ReactNode;
}

export function EvidenceUploadDialog({
  packageId,
  requirementId,
  onUploadComplete,
  triggerButton,
}: EvidenceUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('atoPackageId', packageId);
      if (requirementId) {
        formData.append('requirementId', requirementId);
      }
      if (expirationDate) {
        formData.append('expirationDate', expirationDate.toISOString());
      }

      const result = await uploadEvidence(formData);

      if (result.success) {
        toast.success('Evidence Uploaded Successfully', {
          description: `${selectedFile.name} has been uploaded${requirementId ? ' and linked to the control' : ''}.`,
        });
        setOpen(false);
        setSelectedFile(null);
        setExpirationDate(undefined);
        router.refresh();
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error('Upload Failed', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast.error('Upload Failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return '📊';
    if (file.type.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Evidence
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Evidence</DialogTitle>
          <DialogDescription>
            Upload a file to support your security control implementations.
            {requirementId && ' This file will be automatically linked to the current control.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getFileIcon(selectedFile)}</span>
                    <div className="text-left">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-primary">Click to upload</span>
                    <span className="text-sm text-muted-foreground"> or drag and drop</span>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, Word, Excel, Images, Text (Max 50MB)
                </p>
              </>
            )}
          </div>

          {/* File size warning */}
          {selectedFile && selectedFile.size > 50 * 1024 * 1024 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                File size exceeds 50MB limit. Please select a smaller file.
              </p>
            </div>
          )}

          {/* Expiration Date (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="expiration-date">
              Expiration Date <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <DatePicker
              date={expirationDate}
              onSelect={setExpirationDate}
              fromDate={new Date()}
              placeholder="Pick an expiration date"
            />
            <p className="text-xs text-muted-foreground">
              Set an expiration date to receive notifications before this evidence needs renewal
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || (selectedFile && selectedFile.size > 50 * 1024 * 1024)}
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
