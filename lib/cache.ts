/**
 * Cache Layer
 *
 * Read-through cache backed by SQLite. Checks local cache first,
 * fetches from SaaS API if stale or missing, and stores the result locally.
 */

import {
  getCached,
  getCachedByEngagement,
  setCached,
  getCachedReference,
  setCachedReference,
  type CachedItem,
} from './db'
import {
  fetchEngagements,
  fetchEngagement,
  fetchControls,
  fetchEvidence,
  fetchPoams,
  fetchStigs,
  fetchTeam,
  fetchReferenceData,
  type EngagementSummary,
  type EngagementDetail,
  type ControlForAssessment,
  type EvidenceItem,
  type PoamItem,
  type StigItem,
  type TeamMember,
} from './api-client'

const CACHE_TTL_MS = () => parseInt(process.env.CACHE_TTL_MS || '300000', 10) // 5 min default

function isStale(item: CachedItem | undefined): boolean {
  if (!item) return true
  const fetchedAt = new Date(item.fetched_at).getTime()
  return Date.now() - fetchedAt > CACHE_TTL_MS()
}

// ---- Engagements ----

export async function getEngagements(token: string, forceRefresh = false): Promise<EngagementSummary[]> {
  const cacheKey = 'all'
  const cached = getCached('cached_engagements', cacheKey)

  if (!forceRefresh && !isStale(cached)) {
    return JSON.parse(cached!.data)
  }

  try {
    const engagements = await fetchEngagements(token)
    setCached('cached_engagements', cacheKey, JSON.stringify(engagements))

    // Also cache each individual engagement summary
    for (const eng of engagements) {
      setCached('cached_engagements', eng.id, JSON.stringify(eng))
    }

    return engagements
  } catch (error) {
    // If offline, return stale cache
    if (cached) return JSON.parse(cached.data)
    throw error
  }
}

export async function getEngagement(id: string, token: string, forceRefresh = false): Promise<EngagementDetail> {
  const cached = getCached('cached_engagements', `detail:${id}`)

  if (!forceRefresh && !isStale(cached)) {
    return JSON.parse(cached!.data)
  }

  try {
    const engagement = await fetchEngagement(id, token)
    setCached('cached_engagements', `detail:${id}`, JSON.stringify(engagement))
    return engagement
  } catch (error) {
    if (cached) return JSON.parse(cached.data)
    throw error
  }
}

// ---- Controls ----

export async function getControls(engagementId: string, token: string, forceRefresh = false): Promise<ControlForAssessment[]> {
  const items = getCachedByEngagement('cached_controls', engagementId)
  const listCache = items.find(i => i.id === `list:${engagementId}`)

  if (!forceRefresh && !isStale(listCache)) {
    return JSON.parse(listCache!.data)
  }

  try {
    const controls = await fetchControls(engagementId, token)
    setCached('cached_controls', `list:${engagementId}`, JSON.stringify(controls), engagementId)
    return controls
  } catch (error) {
    if (listCache) return JSON.parse(listCache.data)
    throw error
  }
}

// ---- Evidence ----

export async function getEvidence(engagementId: string, token: string, forceRefresh = false): Promise<EvidenceItem[]> {
  const items = getCachedByEngagement('cached_evidence', engagementId)
  const listCache = items.find(i => i.id === `list:${engagementId}`)

  if (!forceRefresh && !isStale(listCache)) {
    return JSON.parse(listCache!.data)
  }

  try {
    const evidence = await fetchEvidence(engagementId, token)
    setCached('cached_evidence', `list:${engagementId}`, JSON.stringify(evidence), engagementId)
    return evidence
  } catch (error) {
    if (listCache) return JSON.parse(listCache.data)
    throw error
  }
}

// ---- POA&Ms ----

export async function getPoams(engagementId: string, token: string, forceRefresh = false): Promise<PoamItem[]> {
  const items = getCachedByEngagement('cached_poams', engagementId)
  const listCache = items.find(i => i.id === `list:${engagementId}`)

  if (!forceRefresh && !isStale(listCache)) {
    return JSON.parse(listCache!.data)
  }

  try {
    const poams = await fetchPoams(engagementId, token)
    setCached('cached_poams', `list:${engagementId}`, JSON.stringify(poams), engagementId)
    return poams
  } catch (error) {
    if (listCache) return JSON.parse(listCache.data)
    throw error
  }
}

// ---- STIGs ----

export async function getStigs(engagementId: string, token: string, forceRefresh = false): Promise<StigItem[]> {
  const items = getCachedByEngagement('cached_stigs', engagementId)
  const listCache = items.find(i => i.id === `list:${engagementId}`)

  if (!forceRefresh && !isStale(listCache)) {
    return JSON.parse(listCache!.data)
  }

  try {
    const stigs = await fetchStigs(engagementId, token)
    setCached('cached_stigs', `list:${engagementId}`, JSON.stringify(stigs), engagementId)
    return stigs
  } catch (error) {
    if (listCache) return JSON.parse(listCache.data)
    throw error
  }
}

// ---- Team ----

export async function getTeam(engagementId: string, token: string, forceRefresh = false): Promise<TeamMember[]> {
  const items = getCachedByEngagement('cached_team', engagementId)
  const listCache = items.find(i => i.id === `list:${engagementId}`)

  if (!forceRefresh && !isStale(listCache)) {
    return JSON.parse(listCache!.data)
  }

  try {
    const team = await fetchTeam(engagementId, token)
    setCached('cached_team', `list:${engagementId}`, JSON.stringify(team), engagementId)
    return team
  } catch (error) {
    if (listCache) return JSON.parse(listCache.data)
    throw error
  }
}

// ---- Reference Data ----

export async function getReferenceData(key: string, token: string, forceRefresh = false): Promise<unknown> {
  const cached = getCachedReference(key)

  if (!forceRefresh && !isStale(cached)) {
    return JSON.parse(cached!.data)
  }

  try {
    const data = await fetchReferenceData(key, token)
    setCachedReference(key, JSON.stringify(data))
    return data
  } catch (error) {
    if (cached) return JSON.parse(cached.data)
    throw error
  }
}
