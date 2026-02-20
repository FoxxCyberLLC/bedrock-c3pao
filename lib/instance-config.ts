import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'instance.json')

export interface InstanceConfig {
  instanceApiKey: string
  c3paoId: string
  c3paoName: string
  activatedAt: string
  apiUrl: string
}

export function getInstanceConfig(): InstanceConfig | null {
  // Env var takes precedence (pre-configured deployment)
  if (process.env.INSTANCE_API_KEY) {
    return {
      instanceApiKey: process.env.INSTANCE_API_KEY,
      c3paoId: '',
      c3paoName: '',
      activatedAt: '',
      apiUrl: process.env.BEDROCK_API_URL || 'http://localhost:8080',
    }
  }

  // Check config file (written by setup wizard)
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(raw) as InstanceConfig
    }
  } catch {
    // Config file corrupt or missing
  }

  return null
}

export function saveInstanceConfig(config: InstanceConfig): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export function isInstanceConfigured(): boolean {
  return getInstanceConfig() !== null
}
