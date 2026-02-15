// @ts-nocheck
/**
 * CCI to CMMC Objective Mapping Utilities
 *
 * Provides functions to map STIG findings (via CCIs) to CMMC objectives.
 * Chain: STIG Rule CCIs -> 800-53 -> 800-171 -> CMMC Objectives
 */

// prisma removed - using API client

export interface CCIToObjectiveMapping {
  cci: string
  nist80053Control: string
  nist800171Id: string
  objectiveReferences: string[]
}

export interface STIGRuleCMMCMapping {
  ruleId: string
  ruleTitle: string
  severity: string
  status: string
  ccis: string[]
  mappedObjectives: {
    objectiveReference: string
    requirementId: string
    requirementTitle: string
    familyCode: string
  }[]
}

/**
 * Get CMMC objective mappings for a list of CCIs
 *
 * @param ccis Array of CCI identifiers (e.g., ["CCI-000057", "CCI-000058"])
 * @returns Array of mappings showing CCI -> 800-53 -> 800-171 -> Objectives
 */
export async function getCMMCObjectivesForCCIs(
  ccis: string[]
): Promise<CCIToObjectiveMapping[]> {
  if (!ccis || ccis.length === 0) return []

  // Step 1: Get 800-53 controls for these CCIs
  const cciMappings = await prisma.cCIMapping.findMany({
    where: {
      cci: { in: ccis },
    },
    select: {
      cci: true,
      nist80053Control: true,
    },
  })

  if (cciMappings.length === 0) return []

  // Step 2: Get 800-171 requirements for these 800-53 controls
  const controls = [...new Set(cciMappings.map((m: { cci: string; nist80053Control: string }) => m.nist80053Control))]

  const controlTo171Mappings = await prisma.nist80053To800171Mapping.findMany({
    where: {
      nist80053Control: { in: controls },
    },
    include: {
      requirement: {
        include: {
          objectives: {
            select: {
              objectiveReference: true,
            },
          },
        },
      },
    },
  })

  // Step 3: Build the mapping result
  const result: CCIToObjectiveMapping[] = []

  for (const cciMapping of cciMappings) {
    const control171Mappings = controlTo171Mappings.filter(
      (m: typeof controlTo171Mappings[0]) => m.nist80053Control === cciMapping.nist80053Control
    )

    for (const control171 of control171Mappings) {
      const objectiveRefs = control171.requirement?.objectives.map(
        (o: { objectiveReference: string }) => o.objectiveReference
      ) || []

      result.push({
        cci: cciMapping.cci,
        nist80053Control: cciMapping.nist80053Control,
        nist800171Id: control171.nist800171Id,
        objectiveReferences: objectiveRefs,
      })
    }
  }

  return result
}

/**
 * Get CMMC mappings for STIG rules in a checklist
 *
 * @param checklistId The STIG checklist ID
 * @returns Array of STIG rules with their CMMC objective mappings
 */
export async function getSTIGRuleCMMCMappings(
  checklistId: string
): Promise<STIGRuleCMMCMapping[]> {
  // Get all rules in the checklist with their CCIs
  const rules = await prisma.sTIGRule.findMany({
    where: { checklistId },
    select: {
      id: true,
      ruleId: true,
      ruleTitle: true,
      severity: true,
      status: true,
      ccis: true,
    },
  })

  const results: STIGRuleCMMCMapping[] = []

  for (const rule of rules) {
    // Parse CCIs from JSON string
    let ccis: string[] = []
    try {
      ccis = JSON.parse(rule.ccis || '[]')
    } catch {
      ccis = []
    }

    if (ccis.length === 0) {
      results.push({
        ruleId: rule.ruleId,
        ruleTitle: rule.ruleTitle,
        severity: rule.severity,
        status: rule.status,
        ccis: [],
        mappedObjectives: [],
      })
      continue
    }

    // Get CMMC mappings for this rule's CCIs
    const cciMappings = await getCMMCObjectivesForCCIs(ccis)

    // Collect unique objectives
    const objectiveRefs = new Set<string>()
    cciMappings.forEach(m => {
      m.objectiveReferences.forEach(ref => objectiveRefs.add(ref))
    })

    // Get objective details
    const objectives = await prisma.assessmentObjective.findMany({
      where: {
        objectiveReference: { in: [...objectiveRefs] },
      },
      include: {
        requirement: {
          include: {
            family: true,
          },
        },
      },
    })

    results.push({
      ruleId: rule.ruleId,
      ruleTitle: rule.ruleTitle,
      severity: rule.severity,
      status: rule.status,
      ccis,
      mappedObjectives: objectives.map((o: typeof objectives[0]) => ({
        objectiveReference: o.objectiveReference,
        requirementId: o.requirement.requirementId,
        requirementTitle: o.requirement.title,
        familyCode: o.requirement.family.code,
      })),
    })
  }

  return results
}

/**
 * Get summary of CMMC objective coverage from STIG findings
 *
 * @param checklistId The STIG checklist ID
 * @returns Summary of which objectives have STIG coverage and their status
 */
export async function getSTIGCMMCCoverageSummary(checklistId: string): Promise<{
  totalRules: number
  rulesWithMappings: number
  objectivesCovered: string[]
  objectiveStatusSummary: {
    objectiveReference: string
    requirementId: string
    stigFindings: {
      open: number
      notAFinding: number
      notApplicable: number
      notReviewed: number
    }
  }[]
}> {
  const mappings = await getSTIGRuleCMMCMappings(checklistId)

  const objectiveStats = new Map<string, {
    requirementId: string
    open: number
    notAFinding: number
    notApplicable: number
    notReviewed: number
  }>()

  let rulesWithMappings = 0

  for (const rule of mappings) {
    if (rule.mappedObjectives.length > 0) {
      rulesWithMappings++
    }

    for (const obj of rule.mappedObjectives) {
      const existing = objectiveStats.get(obj.objectiveReference) || {
        requirementId: obj.requirementId,
        open: 0,
        notAFinding: 0,
        notApplicable: 0,
        notReviewed: 0,
      }

      switch (rule.status) {
        case 'OPEN':
          existing.open++
          break
        case 'NOT_A_FINDING':
          existing.notAFinding++
          break
        case 'NOT_APPLICABLE':
          existing.notApplicable++
          break
        case 'NOT_REVIEWED':
          existing.notReviewed++
          break
      }

      objectiveStats.set(obj.objectiveReference, existing)
    }
  }

  return {
    totalRules: mappings.length,
    rulesWithMappings,
    objectivesCovered: [...objectiveStats.keys()].sort(),
    objectiveStatusSummary: Array.from(objectiveStats.entries())
      .map(([ref, stats]) => ({
        objectiveReference: ref,
        requirementId: stats.requirementId,
        stigFindings: {
          open: stats.open,
          notAFinding: stats.notAFinding,
          notApplicable: stats.notApplicable,
          notReviewed: stats.notReviewed,
        },
      }))
      .sort((a, b) => a.objectiveReference.localeCompare(b.objectiveReference)),
  }
}

/**
 * Get all CCIs that map to a specific 800-171 requirement
 *
 * @param requirementId The 800-171 requirement ID (e.g., "03.04.02")
 * @returns Array of CCIs and their 800-53 controls
 */
export async function getCCIsForRequirement(requirementId: string): Promise<{
  cci: string
  nist80053Control: string
  definition: string
}[]> {
  // Get 800-53 controls for this requirement
  const controlMappings = await prisma.nist80053To800171Mapping.findMany({
    where: { nist800171Id: requirementId },
    select: { nist80053Control: true },
  })

  if (controlMappings.length === 0) return []

  const controls = controlMappings.map((m: { nist80053Control: string }) => m.nist80053Control)

  // Get CCIs for these controls
  const ccis = await prisma.cCIMapping.findMany({
    where: {
      nist80053Control: { in: controls },
    },
    select: {
      cci: true,
      nist80053Control: true,
      definition: true,
    },
    orderBy: { cci: 'asc' },
  })

  return ccis
}
