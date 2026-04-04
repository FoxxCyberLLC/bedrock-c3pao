'use server'

import crypto from 'crypto'
import { cookies } from 'next/headers'
import { setConfigBatch, getConfig, isAppConfigured } from '@/lib/config'
import { createLocalAdmin } from '@/lib/local-auth'
import { validateApiUrl, isValidApiKey } from '@/lib/setup-validation'

interface ActivateResponse {
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

export async function validateInstanceKey(
  apiKey: string,
  apiUrl: string
): Promise<{
  success: boolean
  data?: ActivateResponse
  error?: string
}> {
  // Re-entry guard: reject if already configured
  if (await isAppConfigured()) {
    return { success: false, error: 'Instance is already configured' }
  }

  if (!isValidApiKey(apiKey)) {
    return { success: false, error: 'Invalid API key format. Keys must start with bri- followed by alphanumeric characters' }
  }

  const urlValidation = validateApiUrl(apiUrl)
  if (!urlValidation.valid) {
    return { success: false, error: urlValidation.error || 'Invalid API URL' }
  }

  try {
    const response = await fetch(`${apiUrl}/api/instance/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
      cache: 'no-store',
    })

    const json = await response.json()

    if (!response.ok || json.error) {
      return {
        success: false,
        error: json.error?.message || 'Failed to validate API key',
      }
    }

    return { success: true, data: json.data }
  } catch {
    return {
      success: false,
      error: 'Cannot reach the Bedrock API. Verify the API URL is correct and reachable.',
    }
  }
}

interface SetupParams {
  apiKey: string
  apiUrl: string
  c3paoId: string
  c3paoName: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export async function completeSetup(
  params: SetupParams
): Promise<{ success: boolean; error?: string }> {
  // Re-entry guard: reject if already configured
  if (await isAppConfigured()) {
    return { success: false, error: 'Instance is already configured' }
  }

  // Re-validate inputs (defense in depth)
  if (!isValidApiKey(params.apiKey)) {
    return { success: false, error: 'Invalid API key format' }
  }

  const urlValidation = validateApiUrl(params.apiUrl)
  if (!urlValidation.valid) {
    return { success: false, error: urlValidation.error || 'Invalid API URL' }
  }

  try {
    const authSecret = crypto.randomBytes(32).toString('base64')

    // Save all config to Postgres
    await setConfigBatch({
      BEDROCK_API_URL: params.apiUrl,
      AUTH_SECRET: authSecret,
      INSTANCE_API_KEY: params.apiKey,
      FORCE_HTTPS: 'true',
      C3PAO_ID: params.c3paoId,
      C3PAO_NAME: params.c3paoName,
      ACTIVATED_AT: new Date().toISOString(),
    })

    // Create local admin user
    await createLocalAdmin(params.adminEmail, params.adminName, params.adminPassword)

    // Inject into process.env for immediate use (no restart needed)
    process.env.BEDROCK_API_URL = params.apiUrl
    process.env.AUTH_SECRET = authSecret
    process.env.INSTANCE_API_KEY = params.apiKey
    process.env.FORCE_HTTPS = 'true'

    // Set cookie so Edge middleware knows setup is done
    const isSecure = process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production'
    const cookieStore = await cookies()
    cookieStore.set('bedrock_instance_configured', 'true', {
      httpOnly: true,
      secure: isSecure,
      maxAge: 60 * 60 * 24 * 30, // 30 days — UX hint only, not a security gate
      path: '/',
      sameSite: 'lax',
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save configuration',
    }
  }
}

export async function getSetupStatus(): Promise<{
  configured: boolean
  config: {
    c3paoName: string
    c3paoId: string
    activatedAt: string
    apiUrl: string
  } | null
}> {
  if (!(await isAppConfigured())) {
    return { configured: false, config: null }
  }

  return {
    configured: true,
    config: {
      c3paoName: (await getConfig('C3PAO_NAME')) || '',
      c3paoId: (await getConfig('C3PAO_ID')) || '',
      activatedAt: (await getConfig('ACTIVATED_AT')) || '',
      apiUrl: (await getConfig('BEDROCK_API_URL')) || '',
    },
  }
}
