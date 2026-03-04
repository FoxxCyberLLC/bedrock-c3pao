'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  Users,
  ClipboardCheck,
  Server,
  Globe,
  UserCog,
  Mail,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { validateInstanceKey, completeSetup } from '@/app/actions/setup'

type WizardStep = 'welcome' | 'connection' | 'validating' | 'admin' | 'saving' | 'complete'

const VISIBLE_STEPS = ['welcome', 'connection', 'admin', 'complete'] as const

interface ActivationData {
  instanceId: string
  c3paoId: string
  c3paoName: string
  c3paoEmail: string
  status: string
  license: {
    type: string
    status: string
    maxSeats: number
    maxAssessmentsPerYear: number
    maxConcurrentAssessments: number
    currentUsers: number
    currentAssessments: number
    expiresAt: string | null
  } | null
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('welcome')
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirm, setAdminConfirm] = useState('')
  const [error, setError] = useState('')
  const [activationData, setActivationData] = useState<ActivationData | null>(null)

  function getStepIndex(s: WizardStep): number {
    const map: Record<WizardStep, number> = {
      welcome: 0,
      connection: 1,
      validating: 1,
      admin: 2,
      saving: 3,
      complete: 3,
    }
    return map[s]
  }

  async function handleValidate() {
    if (!apiUrl.trim()) {
      setError('Please enter the Bedrock API URL')
      return
    }
    if (!apiKey.trim()) {
      setError('Please enter your instance API key')
      return
    }

    setStep('validating')
    setError('')

    const result = await validateInstanceKey(apiKey.trim(), apiUrl.trim())

    if (result.success && result.data) {
      setActivationData(result.data)
      setStep('admin')
    } else {
      setError(result.error || 'Validation failed')
      setStep('connection')
    }
  }

  async function handleComplete() {
    if (!activationData) return

    if (!adminName.trim()) {
      setError('Please enter the admin name')
      return
    }
    if (!adminEmail.trim()) {
      setError('Please enter the admin email')
      return
    }
    if (!adminPassword || adminPassword.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }
    if (adminPassword !== adminConfirm) {
      setError('Passwords do not match')
      return
    }

    setStep('saving')
    setError('')

    const result = await completeSetup({
      apiKey: apiKey.trim(),
      apiUrl: apiUrl.trim(),
      c3paoId: activationData.c3paoId,
      c3paoName: activationData.c3paoName,
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword,
    })

    if (result.success) {
      setStep('complete')
      setTimeout(() => router.push('/login'), 2000)
    } else {
      setError(result.error || 'Failed to save configuration')
      setStep('admin')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {VISIBLE_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  getStepIndex(step) >= i ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
              {i < VISIBLE_STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 transition-colors ${
                    getStepIndex(step) > i ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Welcome step */}
        {step === 'welcome' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Bedrock C3PAO Setup</CardTitle>
              <CardDescription>
                Configure this instance to connect with the Bedrock CMMC platform. You&apos;ll need
                the API URL, the instance key from your Bedrock administrator, and create a local
                admin account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setStep('connection')} className="w-full" size="lg">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Connection step */}
        {step === 'connection' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Server className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Connection Settings</CardTitle>
              <CardDescription>
                Enter the Bedrock platform API URL and your instance API key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="apiUrl" className="text-sm font-medium">
                  Bedrock API URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="apiUrl"
                    type="url"
                    placeholder="https://api.bedrock.example.com"
                    value={apiUrl}
                    onChange={(e) => {
                      setApiUrl(e.target.value)
                      setError('')
                    }}
                    className="pl-10 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The URL of the Bedrock CMMC API backend.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="apiKey" className="text-sm font-medium">
                  Instance API Key
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="bri-..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                    className="pl-10 font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact your Bedrock administrator if you don&apos;t have an API key.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('welcome')
                    setError('')
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleValidate} className="flex-1" size="lg">
                  Validate & Connect
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validating step */}
        {step === 'validating' && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Validating Connection</h3>
                  <p className="text-sm text-muted-foreground">
                    Connecting to the Bedrock platform...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin account step (with verified org banner) */}
        {step === 'admin' && activationData && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserCog className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create Admin Account</CardTitle>
              <CardDescription>
                This account manages instance configuration and security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Verified organization banner */}
              <div className="rounded-lg border bg-green-500/5 border-green-500/20 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected to {activationData.c3paoName}
                </div>
                <div className="flex flex-wrap gap-2 pl-6">
                  {activationData.license && (
                    <>
                      <Badge variant="secondary" className="text-xs">
                        {activationData.license.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {activationData.license.maxSeats} seats
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <ClipboardCheck className="h-3 w-3 mr-1" />
                        {activationData.license.maxAssessmentsPerYear} assessments/yr
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="adminName" className="text-sm font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="Instance Administrator"
                    value={adminName}
                    onChange={(e) => {
                      setAdminName(e.target.value)
                      setError('')
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="adminEmail" className="text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@c3pao.com"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value)
                      setError('')
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="adminPassword" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Minimum 12 characters"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value)
                      setError('')
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="adminConfirm" className="text-sm font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminConfirm"
                    type="password"
                    placeholder="Re-enter password"
                    value={adminConfirm}
                    onChange={(e) => {
                      setAdminConfirm(e.target.value)
                      setError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleComplete()}
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('connection')
                    setActivationData(null)
                    setError('')
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleComplete} className="flex-1" size="lg">
                  Complete Setup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saving step */}
        {step === 'saving' && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Saving Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Securing your instance and creating admin account...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete step */}
        {step === 'complete' && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Setup Complete</h3>
                  <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
