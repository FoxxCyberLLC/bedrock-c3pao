'use client'

import { useState, useEffect } from 'react'
import {
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Server,
  Zap,
  Shield,
  Building2,
  Users,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getConnectionStatus, testConnection } from '@/app/actions/connection'
import { getSetupStatus } from '@/app/actions/setup'

interface ConnectionData {
  apiUrl: string
  connected: boolean
  apiVersion: string | null
  timestamp: string
}

interface InstanceInfo {
  c3paoName: string
  c3paoId: string
  activatedAt: string
  apiUrl: string
}

export default function ConnectionPage() {
  const [data, setData] = useState<ConnectionData | null>(null)
  const [instanceInfo, setInstanceInfo] = useState<InstanceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const [connResult, setupResult] = await Promise.all([
        getConnectionStatus(),
        getSetupStatus(),
      ])

      if (connResult.success && connResult.data) {
        setData(connResult.data as ConnectionData)
      }
      if (setupResult.configured && setupResult.config) {
        setInstanceInfo(setupResult.config)
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
    try {
      const result = await testConnection()
      if (result.success && result.data) {
        setData(result.data as ConnectionData)
        if ((result.data as ConnectionData).connected) {
          toast.success('Connected to Bedrock CMMC API')
        } else {
          toast.error('Cannot reach Bedrock CMMC API')
        }
      }
    } catch (error) {
      console.error('Test connection error:', error)
      toast.error('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connection</h1>
          <p className="text-muted-foreground">Bedrock CMMC API connection status</p>
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
            Bedrock CMMC API connection status
          </p>
        </div>
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
      </div>

      {/* Instance Info */}
      {instanceInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Instance
            </CardTitle>
            <CardDescription>Standalone instance configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Organization</span>
              <span className="text-sm font-medium">{instanceInfo.c3paoName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Activated</span>
              <span className="text-sm">
                {new Date(instanceInfo.activatedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Instance ID</span>
              <span className="text-sm font-mono text-muted-foreground">
                {instanceInfo.c3paoId.slice(0, 12)}...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.connected ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            API Connection
          </CardTitle>
          <CardDescription>Connection to the Bedrock CMMC API backend</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              className={
                data?.connected
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
              }
            >
              {data?.connected ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Disconnected
                </span>
              )}
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" />
                API URL
              </span>
              <span className="text-sm font-mono">{data?.apiUrl || 'Not configured'}</span>
            </div>
            {data?.apiVersion && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Version</span>
                <span className="text-sm">{data.apiVersion}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            The API URL is configured via the <code className="font-mono text-xs bg-background px-1 py-0.5 rounded">BEDROCK_API_URL</code> environment variable.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
