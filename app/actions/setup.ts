'use server'

import { cookies } from 'next/headers'
import { getInstanceConfig, saveInstanceConfig } from '@/lib/instance-config'

const API_URL = process.env.BEDROCK_API_URL || 'http://localhost:8080'

// Matches Go API ActivateResponse shape (flat structure)
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

export async function validateInstanceKey(apiKey: string): Promise<{
  success: boolean
  data?: ActivateResponse
  error?: string
}> {
  if (!apiKey || !apiKey.startsWith('bri-')) {
    return { success: false, error: 'Invalid API key format. Keys start with bri-' }
  }

  try {
    const response = await fetch(`${API_URL}/api/instance/activate`, {
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
      error: 'Cannot reach the Bedrock API. Check your BEDROCK_API_URL configuration.',
    }
  }
}

export async function completeSetup(
  apiKey: string,
  c3paoId: string,
  c3paoName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    saveInstanceConfig({
      instanceApiKey: apiKey,
      c3paoId,
      c3paoName,
      activatedAt: new Date().toISOString(),
      apiUrl: API_URL,
    })

    // Set cookie so Edge middleware knows setup is done
    const cookieStore = await cookies()
    cookieStore.set('bedrock_instance_configured', 'true', {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
      path: '/',
      sameSite: 'lax',
    })

    // Also set the INSTANCE_API_KEY in the process env for immediate use
    process.env.INSTANCE_API_KEY = apiKey

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
  const config = getInstanceConfig()
  if (!config || !config.c3paoId) {
    return { configured: false, config: null }
  }

  return {
    configured: true,
    config: {
      c3paoName: config.c3paoName,
      c3paoId: config.c3paoId,
      activatedAt: config.activatedAt,
      apiUrl: config.apiUrl,
    },
  }
}
