/**
 * Compile-time type tests for api-client.ts.
 * These tests verify that SSPView and AssetView have the correct fields.
 * Any missing field causes a TypeScript compilation error (caught by npx tsc --noEmit).
 */
import { describe, it, expect } from 'vitest'
import { fetchAssets } from '@/lib/api-client'
import type { SSPView, AssetView } from '@/lib/api-client'

// Compile-time field checks — TypeScript will error if any field is missing from SSPView.
// These are NOT runtime assertions; they validate type structure at compile time.
type _SSPViewRequiredFields = {
  systemOwner: SSPView['systemOwner']
  systemOwnerPhone: SSPView['systemOwnerPhone']
  systemOwnerEmail: SSPView['systemOwnerEmail']
  securityOfficer: SSPView['securityOfficer']
  authorizingOfficial: SSPView['authorizingOfficial']
  networkDiagramUrl: SSPView['networkDiagramUrl']
  dataFlowDiagramUrl: SSPView['dataFlowDiagramUrl']
  systemAbbreviation: SSPView['systemAbbreviation']
  systemCategory: SSPView['systemCategory']
  systemPurpose: SSPView['systemPurpose']
  operatingModelPublicCloud: SSPView['operatingModelPublicCloud']
  cuiEndUserWorkstations: SSPView['cuiEndUserWorkstations']
  configurationMgmt: SSPView['configurationMgmt']
  maintenanceProcedures: SSPView['maintenanceProcedures']
  trainingProgram: SSPView['trainingProgram']
  keyStakeholders: SSPView['keyStakeholders']
  additionalRoles: SSPView['additionalRoles']
  acronyms: SSPView['acronyms']
  assetInventorySummary: SSPView['assetInventorySummary']
  operationalPhase: SSPView['operationalPhase']
  statutoryRequirements: SSPView['statutoryRequirements']
  generatedBy: SSPView['generatedBy']
}

// Compile-time field checks for AssetView.
type _AssetViewRequiredFields = {
  id: AssetView['id']
  name: AssetView['name']
  assetType: AssetView['assetType']
  assetCategory: AssetView['assetCategory']
  ipAddress: AssetView['ipAddress']
  macAddress: AssetView['macAddress']
  hostname: AssetView['hostname']
  processesFCI: AssetView['processesFCI']
  processesCUI: AssetView['processesCUI']
  manufacturer: AssetView['manufacturer']
  model: AssetView['model']
  serialNumber: AssetView['serialNumber']
  softwareVersion: AssetView['softwareVersion']
  operatingSystem: AssetView['operatingSystem']
  location: AssetView['location']
  facility: AssetView['facility']
  isManaged: AssetView['isManaged']
  patchLevel: AssetView['patchLevel']
  lastPatchDate: AssetView['lastPatchDate']
  vulnerabilityScore: AssetView['vulnerabilityScore']
  createdAt: AssetView['createdAt']
  updatedAt: AssetView['updatedAt']
}

describe('api-client types', () => {
  it('fetchAssets is exported as a function', () => {
    expect(typeof fetchAssets).toBe('function')
  })
})
