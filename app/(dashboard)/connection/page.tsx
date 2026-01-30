'use client'

import { useState, useEffect } from 'react'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  ArrowUpDown,
  Zap,
  Globe,
  Key,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getConnectionStatus, testConnection, triggerManualSync, saveConnectionConfig } from '@/app/actions/connection'

interface ConnectionData {
  saasUrl: string
  apiKeyConfigured: boolean
  apiKeyPrefix: string
  instanceName: string | null
  syncStatus: string
  pendingCount: number
  lastSyncTime: string | null
  lastHeartbeat: string | null
  lastHeartbeatStatus: string | null
}

export default function ConnectionPage() {
  const [data, setData] = useState<ConnectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ connected: boolean; latencyMs?: number } | null>(null)
  const [saasUrl, setSaasUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const result = await getConnectionStatus()
      if (result.success && result.data) {
        setData(result.data as ConnectionData)
        if (result.data.saasUrl) {
          setSaasUrl(result.data.saasUrl as string)
        }
      }
    } catch (error) {
      console.error('Error loading connection status:', error)
      toast.error('Failed to load connection status')
    } finally {
      setLoading(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection()
      if (result.success && result.data) {
        setTestResult({ connected: true, latencyMs: result.data.latencyMs })
        toast.success(`Connected (${result.data.latencyMs}ms)`)
      } else {
        setTestResult({ connected: false })
        toast.error(result.error || 'Connection failed')
      }
      loadStatus()
    } catch (error) {
      console.error('Test connection error:', error)
      setTestResult({ connected: false })
      toast.error('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await triggerManualSync()
      if (result.success) {
        toast.success('Sync completed')
      } else {
        toast.error(result.error || 'Sync failed')
      }
      loadStatus()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSaveConfig() {
    setSaving(true)
    try {
      const formData = new FormData()
      if (saasUrl.trim()) formData.append('saasUrl', saasUrl.trim())
      if (apiKey.trim()) formData.append('apiKey', apiKey.trim())

      const result = await saveConnectionConfig(formData)
      if (result.success) {
        toast.success('Connection configuration saved')
        setApiKey('')
        setShowApiKey(false)
        loadStatus()
      } else {
        toast.error(result.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Save config error:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`
    return date.toLocaleString()
  }

  const isConnected = data?.lastHeartbeatStatus === 'connected'

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connection</h1>
          <p className="text-muted-foreground">Manage your SaaS platform connection</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connection</h1>
          <p className="text-muted-foreground">
            Manage your connection to the Bedrock CMMC SaaS platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Now
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              Connection Status
            </CardTitle>
            <CardDescription>Current connectivity to the SaaS platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                className={
                  isConnected
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : data?.lastHeartbeat
                    ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                    : 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
                }
              >
                {isConnected ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : data?.lastHeartbeat ? (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Disconnected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Not tested
                  </span>
                )}
              </Badge>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${
                testResult.connected
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
              }`}>
                {testResult.connected
                  ? `Connection successful (${testResult.latencyMs}ms latency)`
                  : 'Connection failed — check SaaS URL and API key configuration'}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Last Heartbeat
                </span>
                <span className="text-sm">{formatTime(data?.lastHeartbeat ?? null)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Instance
                </span>
                <span className="text-sm">{data?.instanceName || 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Sync Status
            </CardTitle>
            <CardDescription>Data synchronization with the SaaS platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sync State</span>
              <Badge variant="outline">
                {data?.syncStatus === 'syncing' ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing
                  </span>
                ) : data?.syncStatus === 'pending' ? (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                ) : data?.syncStatus === 'error' ? (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-3 w-3" />
                    Error
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Idle
                  </span>
                )}
              </Badge>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Items</span>
                <span className={`text-sm font-medium ${
                  (data?.pendingCount ?? 0) > 0 ? 'text-yellow-600' : ''
                }`}>
                  {data?.pendingCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm">{formatTime(data?.lastSyncTime ?? null)}</span>
              </div>
            </div>

            {(data?.pendingCount ?? 0) > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 text-sm text-yellow-700 dark:text-yellow-400">
                {data?.pendingCount} item{data?.pendingCount !== 1 ? 's' : ''} waiting to be synced to the SaaS platform.
                Click &ldquo;Sync Now&rdquo; to push changes immediately.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5" />
            Connection Configuration
          </CardTitle>
          <CardDescription>
            Configure your SaaS platform connection. Get these values from the Instances tab on your C3PAO profile page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="saasUrl">SaaS Platform URL</Label>
                <Input
                  id="saasUrl"
                  value={saasUrl}
                  onChange={(e) => setSaasUrl(e.target.value)}
                  placeholder="https://cmmc.foxxcyber.com"
                />
                <p className="text-xs text-muted-foreground">
                  The URL of your Bedrock CMMC SaaS platform
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">Instance API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={data?.apiKeyConfigured ? `${data.apiKeyPrefix}••••••••` : 'bri_...'}
                      className="font-mono text-xs pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                {data?.apiKeyConfigured ? (
                  <p className="text-xs text-muted-foreground">
                    Key configured ({data.apiKeyPrefix}...). Enter a new key to replace it.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Paste the API key generated from the SaaS platform
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {!data?.apiKeyConfigured && !apiKey && (
                  <p className="text-sm text-yellow-600">
                    Configure your API key to connect to the SaaS platform.
                  </p>
                )}
              </div>
              <Button
                onClick={handleSaveConfig}
                disabled={saving || (!saasUrl.trim() && !apiKey.trim())}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
