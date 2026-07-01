/**
 * Local (air-gapped) C3PAO org data — Task 20: profile, license, skills, users, instance-org.
 *
 * All C3PAO-org-local (this container's own organization + accounts), derived from the instance
 * config and the local_users accounts — never the OSC snapshot, never the Go API. No network.
 */
import { query } from '@/lib/db'
import { getInstanceConfig } from '@/lib/instance-config'
import { listLocalUsers } from '@/lib/local-auth'
import type { C3PAOProfile, C3PAOLicense, C3PAOUserItem, AssessorSkillItem, InstanceOrgDetail } from '@/lib/api-client'

/** The C3PAO organization profile, derived from the instance config. */
export async function getLocalProfile(): Promise<C3PAOProfile> {
  const cfg = await getInstanceConfig()
  const users = await listLocalUsers()
  const assessors = users.filter((u) => u.role === 'assessor' || u.role === 'lead_assessor')
  return {
    id: cfg?.c3paoId ?? 'local',
    name: cfg?.c3paoName ?? 'C3PAO (Air-Gapped)',
    legalName: cfg?.c3paoName ?? null,
    email: '',
    phone: null, website: null, description: null, logo: null,
    address1: null, address2: null, city: null, state: null, zipCode: null, country: null,
    dunsNumber: null, cageCode: null, cyberAbAccreditationId: cfg?.c3paoId ?? null,
    accreditationDate: null, accreditationExpiry: null, authorizedLevels: 'LEVEL_2',
    status: 'ACTIVE', isListed: false, averageRating: null, totalReviews: 0,
    pricingInfo: null, typicalTimeline: null, specialties: null, servicesOffered: null,
    teamStats: { total: assessors.length, active: assessors.length, cca: 0, ccp: 0 },
    engagementStats: { total: 0, active: 0, completed: 0, completedThisYear: 0 },
  } as unknown as C3PAOProfile
}

/** Updating the org profile is not supported in the air-gapped build; returns the current profile. */
export async function updateLocalProfile(): Promise<C3PAOProfile> {
  return getLocalProfile()
}

/** A standalone offline license (no seat/usage metering against a remote platform). */
export async function getLocalLicense(): Promise<C3PAOLicense> {
  const cfg = await getInstanceConfig()
  return {
    id: cfg?.c3paoId ?? 'local',
    licenseKey: 'AIR-GAPPED',
    type: 'STANDALONE',
    status: 'ACTIVE',
    maxSeats: 0,
    maxAssessmentsPerYear: 0,
    maxConcurrentAssessments: 0,
    maxStandaloneInstances: 1,
    currentUsers: 0,
    currentAssessments: 0,
    currentInstances: 1,
    billingPeriod: 'PERPETUAL',
    expiresAt: null,
  }
}

/** Assessor skills are not persisted in the air-gapped build; echoes the submitted set. */
export async function updateLocalAssessorSkills(
  _assessorId: string,
  skills: AssessorSkillItem[]
): Promise<AssessorSkillItem[]> {
  void _assessorId
  return skills
}

function mapUser(r: Record<string, unknown>): C3PAOUserItem {
  const role = String(r.role ?? '')
  return {
    id: String(r.id),
    email: String(r.email ?? ''),
    name: String(r.name ?? ''),
    phone: null,
    jobTitle: null,
    ccaNumber: null,
    ccpNumber: null,
    isLeadAssessor: role === 'lead_assessor',
    assessorType: role === 'lead_assessor' ? 'LEAD' : 'ASSESSOR',
    status: 'ACTIVE',
    lastLogin: null,
    createdAt: r.created_at != null ? String(r.created_at) : '',
    engagements: 0,
  }
}

/** C3PAO users = the local assessor accounts. */
export async function getLocalC3PAOUsers(): Promise<C3PAOUserItem[]> {
  const result = await query(
    `SELECT id, email, name, role, created_at FROM local_users
      WHERE role IN ('assessor', 'lead_assessor') ORDER BY name`
  )
  return result.rows.map(mapUser)
}

/** Instance-org detail (the standalone instance's own organization). */
export async function getLocalInstanceOrg(): Promise<InstanceOrgDetail> {
  const cfg = await getInstanceConfig()
  return {
    id: cfg?.c3paoId ?? 'local',
    name: cfg?.c3paoName ?? 'C3PAO (Air-Gapped)',
    status: 'ACTIVE',
    offline: true,
  } as unknown as InstanceOrgDetail
}

/** Instance users = all local accounts (operators + assessors). */
export async function getLocalInstanceUsers(): Promise<C3PAOUserItem[]> {
  const result = await query(`SELECT id, email, name, role, created_at FROM local_users ORDER BY name`)
  return result.rows.map(mapUser)
}
