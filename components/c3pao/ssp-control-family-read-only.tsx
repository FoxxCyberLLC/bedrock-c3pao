'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, MinusCircle, HelpCircle } from 'lucide-react'

interface ObjectiveStatus {
  id: string
  status: string
  implementationStatement: string | null
  policyReference: string | null
  procedureReference: string | null
  evidenceDescription: string | null
  inheritedStatus: string | null
  responsibilityDescription: string | null
  dependentESP?: { id: string; providerName: string } | null
  espMappings?: Array<{ esp: { id: string; providerName: string } }>
}

interface Objective {
  id: string
  objectiveReference: string
  description: string
  statuses: ObjectiveStatus[]
}

interface RequirementStatus {
  id: string
  status: string
  implementationNotes: string | null
  implementationType: string | null
  processOwner: string | null
  processOperator: string | null
  occurrence: string | null
  technologyInUse: string | null
  documentationLocation: string | null
  supportingPolicy: string | null
  supportingStandard: string | null
  supportingProcedure: string | null
}

interface Requirement {
  id: string
  requirementId: string
  title: string
  basicRequirement: string
  derivedRequirement: string | null
  objectives: Objective[]
  statuses: RequirementStatus[]
}

interface Family {
  id: string
  code: string
  name: string
  requirements: Requirement[]
}

interface SSPControlFamilyReadOnlyProps {
  family: Family
}

function getCompletionStats(family: Family) {
  let total = 0
  let documented = 0
  let compliant = 0
  let inProgress = 0
  let nonCompliant = 0

  family.requirements.forEach((req) => {
    req.objectives.forEach((obj) => {
      total++
      const status = obj.statuses?.[0]
      if (status) {
        if (status.implementationStatement) {
          documented++
        }
        if (status.status === 'COMPLIANT') compliant++
        else if (status.status === 'IN_PROGRESS') inProgress++
        else if (status.status === 'NON_COMPLIANT') nonCompliant++
      }
    })
  })
  return { total, documented, compliant, inProgress, nonCompliant }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLIANT':
      return 'bg-green-600'
    case 'IN_PROGRESS':
      return 'bg-yellow-600'
    case 'NON_COMPLIANT':
      return 'bg-red-600'
    case 'NOT_APPLICABLE':
      return 'bg-gray-400'
    default:
      return 'bg-gray-300'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'COMPLIANT':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'IN_PROGRESS':
      return <MinusCircle className="h-4 w-4 text-yellow-600" />
    case 'NON_COMPLIANT':
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <HelpCircle className="h-4 w-4 text-gray-400" />
  }
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-2 border">{value}</p>
    </div>
  )
}

export function SSPControlFamilyReadOnly({ family }: SSPControlFamilyReadOnlyProps) {
  const stats = getCompletionStats(family)

  return (
    <div id={`family-${family.code}`} className="space-y-2">
      <Accordion type="single" collapsible>
        <AccordionItem value={family.code} className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3 w-full">
              <Badge variant="outline" className="font-mono shrink-0">
                {family.code}
              </Badge>
              <span className="font-medium text-left flex-1">{family.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-green-600">{stats.compliant}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-yellow-600">{stats.inProgress}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-red-600">{stats.nonCompliant}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {stats.documented}/{stats.total} documented
                </span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: stats.total > 0 ? `${(stats.documented / stats.total) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6">
              {family.requirements.map((req) => {
                const reqStatus = req.statuses?.[0]
                return (
                  <div
                    key={req.id}
                    id={`control-${req.requirementId}`}
                    className="space-y-3"
                  >
                    <div className="flex items-start gap-3 pt-4 border-t first:border-t-0 first:pt-0">
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="font-mono">
                          {req.requirementId}
                        </Badge>
                        {reqStatus && (
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(reqStatus.status)}`}
                            title={reqStatus.status}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{req.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {req.basicRequirement}
                        </p>
                        {req.derivedRequirement && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Derived: {req.derivedRequirement}
                          </p>
                        )}
                      </div>
                    </div>

                    {reqStatus && (
                      <div className="ml-4 space-y-3 bg-muted/20 rounded-lg p-3 border border-dashed">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {reqStatus.implementationType && (
                            <div>
                              <span className="text-muted-foreground">Type:</span>{' '}
                              <Badge variant="outline" className="text-xs">{reqStatus.implementationType}</Badge>
                            </div>
                          )}
                          {reqStatus.processOwner && (
                            <div>
                              <span className="text-muted-foreground">Owner:</span> {reqStatus.processOwner}
                            </div>
                          )}
                          {reqStatus.processOperator && (
                            <div>
                              <span className="text-muted-foreground">Operator:</span> {reqStatus.processOperator}
                            </div>
                          )}
                          {reqStatus.occurrence && (
                            <div>
                              <span className="text-muted-foreground">Occurrence:</span> {reqStatus.occurrence}
                            </div>
                          )}
                        </div>
                        {reqStatus.implementationNotes && (
                          <ReadOnlyField label="Implementation Notes" value={reqStatus.implementationNotes} />
                        )}
                        {reqStatus.technologyInUse && (
                          <ReadOnlyField label="Technology in Use" value={reqStatus.technologyInUse} />
                        )}
                        {reqStatus.documentationLocation && (
                          <ReadOnlyField label="Documentation Location" value={reqStatus.documentationLocation} />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {reqStatus.supportingPolicy && (
                            <ReadOnlyField label="Supporting Policy" value={reqStatus.supportingPolicy} />
                          )}
                          {reqStatus.supportingStandard && (
                            <ReadOnlyField label="Supporting Standard" value={reqStatus.supportingStandard} />
                          )}
                          {reqStatus.supportingProcedure && (
                            <ReadOnlyField label="Supporting Procedure" value={reqStatus.supportingProcedure} />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="ml-4 space-y-3">
                      {req.objectives.map((obj) => {
                        const objStatus = obj.statuses?.[0]
                        return (
                          <div
                            key={obj.id}
                            className="border rounded-lg p-3 bg-card"
                          >
                            <div className="flex items-start gap-2">
                              {objStatus && getStatusIcon(objStatus.status)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {obj.objectiveReference}
                                  </Badge>
                                  {objStatus?.inheritedStatus && (
                                    <Badge variant="secondary" className="text-xs">
                                      {objStatus.inheritedStatus}
                                    </Badge>
                                  )}
                                  {(() => {
                                    const espNames = objStatus?.espMappings?.map(m => m.esp.providerName) || []
                                    const fallback = objStatus?.dependentESP?.providerName
                                    const names = espNames.length > 0 ? espNames : (fallback ? [fallback] : [])
                                    return names.map((name, i) => (
                                      <Badge key={i} variant="outline" className="text-xs text-blue-600">
                                        ESP: {name}
                                      </Badge>
                                    ))
                                  })()}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {obj.description}
                                </p>

                                {objStatus && (
                                  <div className="mt-3 space-y-2">
                                    {objStatus.implementationStatement && (
                                      <ReadOnlyField
                                        label="Implementation Statement"
                                        value={objStatus.implementationStatement}
                                      />
                                    )}
                                    {objStatus.responsibilityDescription && (
                                      <ReadOnlyField
                                        label="Responsibility Description"
                                        value={objStatus.responsibilityDescription}
                                      />
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      {objStatus.policyReference && (
                                        <ReadOnlyField
                                          label="Policy Reference"
                                          value={objStatus.policyReference}
                                        />
                                      )}
                                      {objStatus.procedureReference && (
                                        <ReadOnlyField
                                          label="Procedure Reference"
                                          value={objStatus.procedureReference}
                                        />
                                      )}
                                      {objStatus.evidenceDescription && (
                                        <ReadOnlyField
                                          label="Evidence Description"
                                          value={objStatus.evidenceDescription}
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
