'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { safeDate } from '@/lib/utils'
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Search,
  Filter,
  Grid,
  List,
  Download,
  ExternalLink,
  Calendar,
  HardDrive,
  SortAsc,
  SortDesc,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from 'sonner'
import Link from 'next/link'
import { getEvidenceDownloadUrlForC3PAO } from '@/app/actions/c3pao-dashboard'
import { triggerFileDownload } from '@/lib/download'

interface Evidence {
  id: string
  fileName: string
  description: string | null
  mimeType: string | null
  fileSize: number | null
  createdAt: Date
}

interface EvidenceViewerProps {
  evidence: Evidence[]
  engagementId: string
}

type SortField = 'fileName' | 'createdAt' | 'fileSize'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'grid' | 'list'

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown'
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function getFileCategory(mimeType: string | null): string {
  if (!mimeType) return 'other'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet'
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return 'document'
  return 'other'
}

function getFileIcon(mimeType: string | null) {
  const category = getFileCategory(mimeType)
  switch (category) {
    case 'image':
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'spreadsheet':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    case 'document':
      return <FileText className="h-5 w-5 text-blue-600" />
    default:
      return <File className="h-5 w-5 text-gray-500" />
  }
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
}

const categoryLabels: Record<string, string> = {
  all: 'All Files',
  image: 'Images',
  pdf: 'PDFs',
  spreadsheet: 'Spreadsheets',
  document: 'Documents',
  other: 'Other',
}

export function EvidenceViewer({ evidence, engagementId }: EvidenceViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: evidence.length }
    evidence.forEach((ev) => {
      const category = getFileCategory(ev.mimeType)
      counts[category] = (counts[category] || 0) + 1
    })
    return counts
  }, [evidence])

  // Filter and sort evidence
  const filteredEvidence = useMemo(() => {
    const filtered = evidence.filter((ev) => {
      const matchesSearch =
        ev.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory =
        categoryFilter === 'all' || getFileCategory(ev.mimeType) === categoryFilter

      return matchesSearch && matchesCategory
    })

    // Sort (filter already creates a new array)
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'fileName':
          comparison = a.fileName.localeCompare(b.fileName)
          break
        case 'createdAt':
          comparison = (safeDate(a.createdAt)?.getTime() ?? 0) - (safeDate(b.createdAt)?.getTime() ?? 0)
          break
        case 'fileSize':
          comparison = (a.fileSize || 0) - (b.fileSize || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [evidence, searchQuery, categoryFilter, sortField, sortOrder])

  // Calculate total size
  const totalSize = useMemo(() => {
    return evidence.reduce((sum, ev) => sum + (ev.fileSize || 0), 0)
  }, [evidence])

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  const handleDownload = async (evidenceId: string, fileName: string) => {
    setDownloadingId(evidenceId)
    try {
      const result = await getEvidenceDownloadUrlForC3PAO(evidenceId, engagementId)
      if (result.success && result.data) {
        triggerFileDownload(result.data.url, fileName)
        toast.success('Download Started', { description: `Downloading ${fileName}` })
      } else {
        toast.error('Download Failed', { description: result.error || 'Could not generate download URL' })
      }
    } catch {
      toast.error('Download Failed', { description: 'An unexpected error occurred' })
    } finally {
      setDownloadingId(null)
    }
  }

  if (evidence.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No Evidence Files</h3>
          <p className="text-muted-foreground mt-1">
            No evidence has been uploaded for this package
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Evidence Overview</CardTitle>
          <CardDescription>
            {evidence.length} files | {formatFileSize(totalSize)} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  categoryFilter === category
                    ? 'bg-primary/10 ring-2 ring-primary/20'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{categoryLabels[category]}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fileName">Name</SelectItem>
                  <SelectItem value="createdAt">Date</SelectItem>
                  <SelectItem value="fileSize">Size</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence List/Grid */}
      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvidence.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        {getFileIcon(ev.mimeType)}
                        <div>
                          <div className="font-medium text-sm">{ev.fileName}</div>
                          {ev.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {ev.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getFileExtension(ev.fileName)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(ev.fileSize)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {safeDate(ev.createdAt) ? format(safeDate(ev.createdAt)!, 'MMM d, yyyy') : '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Open review page"
                          asChild
                        >
                          <Link href={`/engagements/${engagementId}/evidence/${ev.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={downloadingId === ev.id}
                          onClick={() => handleDownload(ev.id, ev.fileName)}
                          title="Download"
                        >
                          {downloadingId === ev.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidence.map((ev) => (
            <Card key={ev.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-lg bg-muted">
                    {getFileIcon(ev.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{ev.fileName}</div>
                    {ev.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {ev.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(ev.fileSize)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {safeDate(ev.createdAt) ? format(safeDate(ev.createdAt)!, 'MMM d') : '--'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/engagements/${engagementId}/evidence/${ev.id}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Review
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={downloadingId === ev.id}
                    onClick={() => handleDownload(ev.id, ev.fileName)}
                  >
                    {downloadingId === ev.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredEvidence.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No files found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground text-center">
        Evidence files are read-only during assessment review
      </div>
    </div>
  )
}
