'use server'

import { requireAuth } from '@/lib/auth'
import { getAllConfig } from '@/lib/config'
import { getEncryptionKeyHex } from '@/lib/crypto'
import { getLocalAdmin } from '@/lib/local-auth'

export async function getAdminSettings() {
  const session = await requireAuth()
  if (!session?.isLocalAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  const config = getAllConfig()
  const admin = getLocalAdmin()

  return {
    success: true,
    data: {
      apiUrl: config.BEDROCK_API_URL || '',
      c3paoName: config.C3PAO_NAME || '',
      c3paoId: config.C3PAO_ID || '',
      activatedAt: config.ACTIVATED_AT || '',
      forceHttps: config.FORCE_HTTPS || 'true',
      encryptionKey: getEncryptionKeyHex(),
      adminEmail: admin?.email || '',
      adminName: admin?.name || '',
    },
  }
}
