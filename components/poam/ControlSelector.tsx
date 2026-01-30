"use client"

import { useState, useMemo } from "react"
import { Search, Filter, X, CheckSquare, Square } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Requirement {
  id: string
  requirementId: string
  title: string
  familyCode: string
  familyName: string
  status: string
}

interface ControlSelectorProps {
  requirements: Requirement[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  singleSelect?: boolean
}

export function ControlSelector({
  requirements,
  selectedIds,
  onSelectionChange,
  singleSelect = false,
}: ControlSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [familyFilter, setFamilyFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Get unique families
  const families = useMemo(() => {
    const familyMap = new Map<string, { code: string; name: string }>()
    requirements.forEach((r) => {
      if (!familyMap.has(r.familyCode)) {
        familyMap.set(r.familyCode, { code: r.familyCode, name: r.familyName })
      }
    })
    return Array.from(familyMap.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [requirements])

  // Filter requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      // Search filter
      const matchesSearch = searchQuery === "" ||
        req.requirementId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.familyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.familyName.toLowerCase().includes(searchQuery.toLowerCase())

      // Family filter
      const matchesFamily = familyFilter === "all" || req.familyCode === familyFilter

      // Status filter
      const matchesStatus = statusFilter === "all" || req.status === statusFilter

      return matchesSearch && matchesFamily && matchesStatus
    })
  }, [requirements, searchQuery, familyFilter, statusFilter])

  const handleToggle = (id: string) => {
    if (singleSelect) {
      onSelectionChange([id])
    } else {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
      } else {
        onSelectionChange([...selectedIds, id])
      }
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRequirements.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(filteredRequirements.map((r) => r.id))
    }
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setFamilyFilter("all")
    setStatusFilter("all")
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      NOT_STARTED: { label: "Not Started", variant: "secondary" },
      IN_PROGRESS: { label: "In Progress", variant: "default" },
      NON_COMPLIANT: { label: "Non-Compliant", variant: "destructive" },
      COMPLIANT: { label: "Compliant", variant: "outline" },
    }
    const config = statusConfig[status] || statusConfig.NOT_STARTED
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const hasActiveFilters = searchQuery !== "" || familyFilter !== "all" || statusFilter !== "all"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              {singleSelect ? "Select Control" : "Select Controls"}
            </CardTitle>
            <CardDescription>
              {singleSelect
                ? "Choose the security control that needs remediation"
                : "Choose one or more security controls that need remediation"
              }
            </CardDescription>
          </div>
          {selectedIds.length > 0 && (
            <Badge variant="default" className="text-sm">
              {selectedIds.length} selected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, title, or family..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Select value={familyFilter} onValueChange={setFamilyFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.code} value={family.code}>
                      {family.code} - {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="default"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground py-2">
          <span>
            Showing {filteredRequirements.length} of {requirements.length} controls
          </span>
          {!singleSelect && filteredRequirements.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectAll()}
            >
              {selectedIds.length === filteredRequirements.length ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Deselect All
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Select All
                </>
              )}
            </Button>
          )}
        </div>

        {/* Requirements Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          {filteredRequirements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No controls found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "No non-compliant controls available for this package"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[50px]">
                    {!singleSelect && (
                      <Checkbox
                        checked={selectedIds.length === filteredRequirements.length && filteredRequirements.length > 0}
                        onCheckedChange={() => handleSelectAll()}
                        aria-label="Select all"
                      />
                    )}
                  </TableHead>
                  <TableHead className="w-[100px]">Family</TableHead>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.map((req) => {
                  const isSelected = selectedIds.includes(req.id)
                  return (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => handleToggle(req.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(req.id)}
                          aria-label={`Select ${req.requirementId}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {req.familyCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium font-mono text-sm">
                        {req.requirementId}
                      </TableCell>
                      <TableCell className="text-sm">
                        {req.title}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(req.status)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* Selected Items Preview */}
        {selectedIds.length > 0 && !singleSelect && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Selected Controls:</div>
            <div className="flex flex-wrap gap-2">
              {selectedIds.map((id) => {
                const req = requirements.find((r) => r.id === id)
                if (!req) return null
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 gap-2"
                  >
                    <span className="font-mono text-xs">{req.requirementId}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggle(id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
