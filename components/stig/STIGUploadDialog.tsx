'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, AlertCircle, CheckCircle2, FileJson } from 'lucide-react';
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
import { toast } from 'sonner';
import { importCKLBFile } from '@/app/actions/stig';

interface STIGUploadDialogProps {
  packageId: string;
  onUploadComplete?: () => void;
  triggerButton?: React.ReactNode;
}

export function STIGUploadDialog({
  packageId,
  onUploadComplete,
  triggerButton,
}: STIGUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    targetsImported: number;
    stigsImported: number;
    rulesImported: number;
    targetHostname: string;
  } | null>(null);
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
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.cklb') && !fileName.endsWith('.json')) {
      toast.error('Invalid file type', {
        description: 'Please upload a CKLB file (.cklb or .json)',
      });
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('atoPackageId', packageId);

      const result = await importCKLBFile(formData);

      if (result.success && result.data) {
        setUploadResult(result.data);
        toast.success('STIG Checklist Imported', {
          description: `Imported ${result.data.stigsImported} STIGs with ${result.data.rulesImported} rules from ${result.data.targetHostname}`,
        });
        router.refresh();
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error('Import Failed', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error importing CKLB file:', error);
      toast.error('Import Failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Import CKLB
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import STIG Checklist</DialogTitle>
          <DialogDescription>
            Upload a CKLB file from STIG Viewer or SCC to import scan results as part of your body of evidence.
          </DialogDescription>
        </DialogHeader>

        {uploadResult ? (
          // Success state
          <div className="py-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Import Successful</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Target: {uploadResult.targetHostname}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full pt-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{uploadResult.stigsImported}</p>
                  <p className="text-xs text-muted-foreground">STIGs</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{uploadResult.rulesImported}</p>
                  <p className="text-xs text-muted-foreground">Rules</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{uploadResult.targetsImported}</p>
                  <p className="text-xs text-muted-foreground">Targets</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Upload state
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
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileJson className="h-8 w-8 text-blue-500 shrink-0" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="font-medium text-sm break-all line-clamp-2" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <FileJson className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <div className="mt-4">
                    <Label htmlFor="cklb-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-primary">Click to upload</span>
                      <span className="text-sm text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <Input
                      id="cklb-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".cklb,.json"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    CKLB files (.cklb or .json) from STIG Viewer or SCC
                  </p>
                </>
              )}
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">What is a CKLB file?</p>
                <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
                  CKLB files are STIG checklists in JSON format, generated by STIG Viewer or SCAP Compliance Checker (SCC). They contain security configuration scan results.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {uploadResult ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
