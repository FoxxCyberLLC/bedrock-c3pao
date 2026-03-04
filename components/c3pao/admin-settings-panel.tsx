'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Server,
  Key,
  Building2,
  User,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { getAdminSettings } from '@/app/actions/admin'
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

export function AdminSettingsPanel({ userName }: { userName: string }) {
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getAdminSettings().then((result) => {
      if (result.success && result.data) {
        setData(result.data)
      }
    })
  }, [])

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Instance Administration</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {userName}
            </p>
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
              <CardDescription>
                API connection and instance configuration.
              </CardDescription>
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
                  data.activatedAt
                    ? new Date(data.activatedAt).toLocaleString()
                    : 'Unknown'
                }
              />
            </CardContent>
          </Card>

          {/* Admin Account */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Admin Account</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConfigRow label="Name" value={data.adminName} />
              <ConfigRow label="Email" value={data.adminEmail} />
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
                    {showKey ? data.encryptionKey : '••••••••••••••••••••••••••••••••••••••••••••••••'}
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
