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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { validateInstanceKey, completeSetup } from '@/app/actions/setup'

type WizardStep = 'welcome' | 'validating' | 'confirm' | 'saving' | 'complete'

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
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [activationData, setActivationData] = useState<ActivationData | null>(null)

  async function handleValidate() {
    if (!apiKey.trim()) {
      setError('Please enter your instance API key')
      return
    }

    setStep('validating')
    setError('')

    const result = await validateInstanceKey(apiKey.trim())

    if (result.success && result.data) {
      setActivationData(result.data)
      setStep('confirm')
    } else {
      setError(result.error || 'Validation failed')
      setStep('welcome')
    }
  }

  async function handleComplete() {
    if (!activationData) return

    setStep('saving')

    const result = await completeSetup(
      apiKey.trim(),
      activationData.c3paoId,
      activationData.c3paoName
    )

    if (result.success) {
      setStep('complete')
      // Redirect to login after a brief pause
      setTimeout(() => router.push('/login'), 2000)
    } else {
      setError(result.error || 'Failed to save configuration')
      setStep('confirm')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['welcome', 'validating', 'confirm', 'complete'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  step === s || (['validating', 'confirm', 'complete'].indexOf(step) >= i)
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                }`}
              />
              {i < 3 && (
                <div className={`w-8 h-0.5 transition-colors ${
                  (['validating', 'confirm', 'complete'].indexOf(step) > i)
                    ? 'bg-primary'
                    : 'bg-muted-foreground/20'
                }`} />
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
                Configure this instance to connect with the Bedrock platform.
                Enter the API key provided by your Bedrock administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    {error}
                  </p>
                )}
              </div>

              <Button onClick={handleValidate} className="w-full" size="lg">
                Validate Key
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Contact your Bedrock platform administrator if you don&apos;t have an API key.
              </p>
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
                  <h3 className="text-lg font-semibold">Validating API Key</h3>
                  <p className="text-sm text-muted-foreground">
                    Connecting to the Bedrock platform...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirm step */}
        {step === 'confirm' && activationData && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Instance Verified</CardTitle>
              <CardDescription>
                Your API key has been validated. Review the details below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Organization info */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  Organization
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{activationData.c3paoName}</span>
                  </div>
                  {activationData.c3paoEmail && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span>{activationData.c3paoEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* License info */}
              {activationData.license && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-primary" />
                    License
                  </div>
                  <div className="space-y-2 pl-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="secondary">{activationData.license.type}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className="bg-green-500/10 text-green-700">
                        {activationData.license.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Assessor Seats
                      </span>
                      <span>{activationData.license.maxSeats}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" />
                        Assessments / Year
                      </span>
                      <span>{activationData.license.maxAssessmentsPerYear}</span>
                    </div>
                    {activationData.license.expiresAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expires</span>
                        <span>{new Date(activationData.license.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Connection info */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Server className="h-4 w-4 text-primary" />
                  Connection
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">API Status</span>
                    <Badge className="bg-green-500/10 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Instance ID</span>
                    <span className="font-mono text-xs">{activationData.instanceId.slice(0, 12)}...</span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('welcome')
                    setApiKey('')
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
                    Setting up your instance...
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
                  <p className="text-sm text-muted-foreground">
                    Redirecting to login...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
