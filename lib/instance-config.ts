import { getConfig, isAppConfigured } from './config'

export interface InstanceConfig {
  instanceApiKey: string
  c3paoId: string
  c3paoName: string
  activatedAt: string
  apiUrl: string
}

export function getInstanceConfig(): InstanceConfig | null {
  const key = process.env.INSTANCE_API_KEY
  if (!key) return null

  return {
    instanceApiKey: key,
    c3paoId: process.env.C3PAO_ID || getConfig('C3PAO_ID') || '',
    c3paoName: process.env.C3PAO_NAME || getConfig('C3PAO_NAME') || '',
    activatedAt: process.env.ACTIVATED_AT || getConfig('ACTIVATED_AT') || '',
    apiUrl: process.env.BEDROCK_API_URL || 'http://localhost:8080',
  }
}

export function isInstanceConfigured(): boolean {
  return !!process.env.INSTANCE_API_KEY || isAppConfigured()
}
