import { isOffline } from '@/lib/mode'
import { SetupWizard } from './setup-wizard'

/**
 * Server wrapper: resolves the air-gap mode on the server (env-driven) and hands it to the
 * client wizard, which branches the flow (offline skips the Bedrock connection step).
 */
export default function SetupPage() {
  return <SetupWizard offline={isOffline()} />
}
