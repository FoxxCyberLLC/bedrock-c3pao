'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Server,
  Key,
  Building2,
  Users,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
  Plus,
  Trash2,
  KeyRound,
  Pencil,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  getAdminSettings,
  getUsers,
  createUser,
  editUser,
  resetPassword,
  removeUser,
} from '@/app/actions/admin'
import { c3paoLogout } from '@/app/actions/c3pao-auth'

interface AdminData {
  apiUrl: string
  c3paoName: string
  c3paoId: string
  activatedAt: string
  forceHttps: string
  encryptionKey: string
  adminEmail: string
  adminName: string
}

interface LocalUser {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export function AdminSettingsPanel({ userName, embedded = false }: { userName: string; embedded?: boolean }) {
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [users, setUsers] = useState<LocalUser[]>([])
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  // Dialog state
  const [dialogMode, setDialogMode] = useState<
    'closed' | 'create' | 'edit' | 'reset-password' | 'delete'
  >('closed')
  const [selectedUser, setSelectedUser] = useState<LocalUser | null>(null)
  const [formError, setFormError] = useState('')

  // Form fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user')

  const loadUsers = useCallback(async () => {
    const result = await getUsers()
    if (result.success && result.data) setUsers(result.data)
  }, [])

  useEffect(() => {
    getAdminSettings().then((result) => {
      if (result.success && result.data) setData(result.data)
    })
    getUsers().then((result) => {
      if (result.success && result.data) setUsers(result.data)
    })
  }, [])

  function openCreate() {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('user')
    setFormError('')
    setDialogMode('create')
  }

  function openEdit(user: LocalUser) {
    setSelectedUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(user.role as 'admin' | 'user')
    setFormError('')
    setDialogMode('edit')
  }

  function openResetPassword(user: LocalUser) {
    setSelectedUser(user)
    setFormPassword('')
    setFormError('')
    setDialogMode('reset-password')
  }

  function openDelete(user: LocalUser) {
    setSelectedUser(user)
    setFormError('')
    setDialogMode('delete')
  }

  async function handleCreate() {
    setFormError('')
    const result = await createUser({
      email: formEmail,
      name: formName,
      password: formPassword,
      role: formRole,
    })
    if (!result.success) {
      setFormError(result.error || 'Failed to create user')
      return
    }
    setDialogMode('closed')
    loadUsers()
  }

  async function handleEdit() {
    if (!selectedUser) return
    setFormError('')
    const result = await editUser({
      id: selectedUser.id,
      name: formName,
      email: formEmail,
      role: formRole,
    })
    if (!result.success) {
      setFormError(result.error || 'Failed to update user')
      return
    }
    setDialogMode('closed')
    loadUsers()
  }

  async function handleResetPassword() {
    if (!selectedUser) return
    setFormError('')
    const result = await resetPassword({
      id: selectedUser.id,
      newPassword: formPassword,
    })
    if (!result.success) {
      setFormError(result.error || 'Failed to reset password')
      return
    }
    setDialogMode('closed')
  }

  async function handleDelete() {
    if (!selectedUser) return
    setFormError('')
    const result = await removeUser({ id: selectedUser.id })
    if (!result.success) {
      setFormError(result.error || 'Failed to delete user')
      return
    }
    setDialogMode('closed')
    loadUsers()
  }

  async function handleCopyKey() {
    if (!data) return
    await navigator.clipboard.writeText(data.encryptionKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogout() {
    await c3paoLogout()
    router.push('/login')
  }

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 max-w-4xl mx-auto space-y-6'}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Instance Administration</h1>
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
      )}

      {!data ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading configuration...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Connection Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <CardTitle>Connection Settings</CardTitle>
              </div>
              <CardDescription>API connection and instance configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConfigRow label="Bedrock API URL" value={data.apiUrl} mono />
              <ConfigRow
                label="HTTPS Enforcement"
                value={
                  <Badge className="bg-green-500/10 text-green-700">
                    <Lock className="h-3 w-3 mr-1" />
                    Always Enforced
                  </Badge>
                }
              />
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Organization</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConfigRow label="C3PAO Name" value={data.c3paoName} />
              <ConfigRow label="C3PAO ID" value={data.c3paoId} mono />
              <ConfigRow
                label="Activated"
                value={
                  data.activatedAt ? new Date(data.activatedAt).toLocaleString() : 'Unknown'
                }
              />
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>User Management</CardTitle>
                </div>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
              <CardDescription>
                Manage local instance users. Admins can access this settings page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
              ) : (
                <div className="divide-y">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit user">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openResetPassword(user)}
                          title="Reset password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(user)}
                          title="Delete user"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Encryption Key */}
          <Card className="border-amber-500/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-600" />
                <CardTitle>Database Encryption Key</CardTitle>
              </div>
              <CardDescription>
                This key encrypts sensitive values in the local database. Store it securely — it is
                required to recover data if the instance is rebuilt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono break-all select-all">
                    {showKey
                      ? data.encryptionKey
                      : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopyKey}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-amber-600 font-medium">
                  Do not share this key. It provides access to all encrypted configuration data.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create / Edit User Dialog */}
      <Dialog
        open={dialogMode === 'create' || dialogMode === 'edit'}
        onOpenChange={() => setDialogMode('closed')}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Add User' : 'Edit User'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Create a new local instance user.'
                : `Editing ${selectedUser?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="jane@c3pao.com"
              />
            </div>
            {dialogMode === 'create' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimum 12 characters"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as 'admin' | 'user')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admins can access instance settings and manage users.
              </p>
            </div>
            {formError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode('closed')}>
              Cancel
            </Button>
            <Button onClick={dialogMode === 'create' ? handleCreate : handleEdit}>
              {dialogMode === 'create' ? 'Create User' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={dialogMode === 'reset-password'}
        onOpenChange={() => setDialogMode('closed')}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.name} ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Minimum 12 characters"
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode('closed')}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={dialogMode === 'delete'} onOpenChange={() => setDialogMode('closed')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name} ({selectedUser?.email})? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode('closed')}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConfigRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {typeof value === 'string' ? (
        <span className={`text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
      ) : (
        value
      )}
    </div>
  )
}
