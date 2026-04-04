import { getConfig, isAppConfigured } from './config'

export interface InstanceConfig {
  instanceApiKey: string
  c3paoId: string
  c3paoName: string
  activatedAt: string
  apiUrl: string
}

export async function getInstanceConfig(): Promise<InstanceConfig | null> {
  const key = process.env.INSTANCE_API_KEY
  if (!key) return null

  return {
    instanceApiKey: key,
    c3paoId: process.env.C3PAO_ID || (await getConfig('C3PAO_ID')) || '',
    c3paoName: process.env.C3PAO_NAME || (await getConfig('C3PAO_NAME')) || '',
    activatedAt: process.env.ACTIVATED_AT || (await getConfig('ACTIVATED_AT')) || '',
    apiUrl: process.env.BEDROCK_API_URL || 'http://localhost:8080',
  }
}

export async function isInstanceConfigured(): Promise<boolean> {
  return !!process.env.INSTANCE_API_KEY || (await isAppConfigured())
}
