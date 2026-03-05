'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Star,
  Shield,
  Mail,
  Phone,
  Globe,
  MapPin,
  Plus,
  CheckCircle,
  XCircle,
  MoreVertical,
  Trash2,
  Settings,
  LogOut,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'
import {
  getInstanceOrg,
  getInstanceUsers,
  updateInstanceUserStatus,
  removeInstanceUser,
} from '@/app/actions/instance-org'
import { c3paoLogout } from '@/app/actions/c3pao-auth'
import { AddAssessorDialog } from './add-assessor-dialog'
import { AdminSettingsPanel } from './admin-settings-panel'
import type { InstanceOrgDetail, C3PAOUserItem } from '@/lib/api-client'

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'

export function AdminPanel({ userName }: { userName: string }) {
  const router = useRouter()
  const [org, setOrg] = useState<InstanceOrgDetail | null>(null)
  const [users, setUsers] = useState<C3PAOUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [orgResult, usersResult] = await Promise.all([
      getInstanceOrg(),
      getInstanceUsers(),
    ])
    if (orgResult.success && orgResult.data) setOrg(orgResult.data)
    if (usersResult.success && usersResult.data) setUsers(usersResult.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleLogout() {
    await c3paoLogout()
    router.push('/login')
  }

  async function handleUserStatusChange(userId: string, newStatus: UserStatus) {
    const result = await updateInstanceUserStatus(userId, newStatus)
    if (result.success) {
      toast.success('User status updated')
      loadData()
    } else {
      toast.error(result.error || 'Failed to update status')
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to deactivate "${userName}"?`)) return
    const result = await removeInstanceUser(userId)
    if (result.success) {
      toast.success('User deactivated')
      loadData()
    } else {
      toast.error(result.error || 'Failed to deactivate user')
    }
  }

  const getUserStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Active', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
      INACTIVE: { label: 'Inactive', className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20' },
      PENDING: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' },
    }
    const c = config[status] || config.PENDING
    return <Badge className={c.className}>{c.label}</Badge>
  }

  let authorizedLevels: string[] = []
  if (org?.authorizedLevels) {
    try { authorizedLevels = JSON.parse(org.authorizedLevels) } catch { /* corrupted */ }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{org?.name || 'Instance Administration'}</h1>
            <p className="text-sm text-muted-foreground">Signed in as {userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Stats */}
          {org && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assessors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{org.userCount}</div>
                  <p className="text-xs text-muted-foreground">of {org.maxUsers} max</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagements</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{org.engagementCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rating</CardTitle>
                  <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {org.averageRating?.toFixed(1) || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">{org.totalReviews} reviews</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Authorized Levels</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-1">
                    {authorizedLevels.length > 0 ? (
                      authorizedLevels.map((level: string) => (
                        <Badge key={level} variant="outline" className="text-xs">
                          {level.replace('LEVEL_', 'L')}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Organization</TabsTrigger>
              <TabsTrigger value="users">Assessors ({users.length})</TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <OrgDetailsTab org={org} authorizedLevels={authorizedLevels} />
            </TabsContent>

            <TabsContent value="users">
              <AssessorsTab
                users={users}
                orgName={org?.name || ''}
                addDialogOpen={addDialogOpen}
                setAddDialogOpen={setAddDialogOpen}
                getUserStatusBadge={getUserStatusBadge}
                onStatusChange={handleUserStatusChange}
                onDeleteUser={handleDeleteUser}
                onUserAdded={loadData}
              />
            </TabsContent>

            <TabsContent value="settings">
              <AdminSettingsPanel userName={userName} embedded />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

function OrgDetailsTab({
  org,
  authorizedLevels,
}: {
  org: InstanceOrgDetail | null
  authorizedLevels: string[]
}) {
  if (!org) return null

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{org.email}</span>
          </div>
          {org.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{org.phone}</span>
            </div>
          )}
          {org.website && (
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {org.website}
              </a>
            </div>
          )}
          {(org.city || org.state) && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {[org.address1, org.city, org.state, org.zipCode].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accreditation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {org.cyberAbAccreditationId && (
            <div>
              <p className="text-sm text-muted-foreground">Cyber-AB Accreditation ID</p>
              <p className="font-medium">{org.cyberAbAccreditationId}</p>
            </div>
          )}
          {org.cageCode && (
            <div>
              <p className="text-sm text-muted-foreground">CAGE Code</p>
              <p className="font-medium">{org.cageCode}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Authorized Levels</p>
            <div className="flex gap-2 mt-1">
              {authorizedLevels.length > 0 ? (
                authorizedLevels.map((level: string) => (
                  <Badge key={level}>{level.replace('_', ' ')}</Badge>
                ))
              ) : (
                <span className="text-muted-foreground">Not specified</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Marketplace Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {org.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{org.description}</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {org.typicalTimeline && (
              <div>
                <p className="text-sm text-muted-foreground">Typical Timeline</p>
                <p className="font-medium">{org.typicalTimeline}</p>
              </div>
            )}
            {org.pricingInfo && (
              <div>
                <p className="text-sm text-muted-foreground">Pricing</p>
                <p className="font-medium">{org.pricingInfo}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AssessorsTab({
  users,
  orgName,
  addDialogOpen,
  setAddDialogOpen,
  getUserStatusBadge,
  onStatusChange,
  onDeleteUser,
  onUserAdded,
}: {
  users: C3PAOUserItem[]
  orgName: string
  addDialogOpen: boolean
  setAddDialogOpen: (open: boolean) => void
  getUserStatusBadge: (status: string) => React.ReactNode
  onStatusChange: (userId: string, status: UserStatus) => void
  onDeleteUser: (userId: string, name: string) => void
  onUserAdded: () => void
}) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assessors</CardTitle>
            <CardDescription>Manage C3PAO team members</CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Assessor
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Assessors</h3>
              <p className="text-muted-foreground">Add the first assessor for your organization</p>
              <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Assessor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Certifications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.jobTitle || '-'}
                        {user.isLeadAssessor && (
                          <Badge variant="outline" className="text-xs">Lead</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.ccaNumber && <p className="text-sm">CCA: {user.ccaNumber}</p>}
                        {user.ccpNumber && <p className="text-sm">CCP: {user.ccpNumber}</p>}
                        {!user.ccaNumber && !user.ccpNumber && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getUserStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.status !== 'ACTIVE' && (
                            <DropdownMenuItem onClick={() => onStatusChange(user.id, 'ACTIVE')}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'INACTIVE' && (
                            <DropdownMenuItem onClick={() => onStatusChange(user.id, 'INACTIVE')}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDeleteUser(user.id, user.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddAssessorDialog
        c3paoName={orgName}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={onUserAdded}
      />
    </>
  )
}
