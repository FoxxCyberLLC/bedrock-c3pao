'use client'

import { useState } from 'react'
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Scale,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface SPRSHelpCardProps {
  score?: number
  compact?: boolean
}

export function SPRSHelpCard({ score, compact = false }: SPRSHelpCardProps) {
  const [isOpen, setIsOpen] = useState(!compact)

  const getScoreGuidance = (s: number) => {
    if (s === 110) {
      return {
        status: 'Full Compliance',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        message: 'All 110 NIST 800-171 requirements are implemented. No POA&M items required.',
        action: 'Maintain your security posture and prepare for official C3PAO assessment.',
      }
    } else if (s >= 80) {
      return {
        status: 'Few Gaps',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        message: `${110 - s} points deducted for non-compliant controls. POA&Ms will be required for gaps.`,
        action: 'Create POA&Ms for non-compliant controls and work to remediate within required timeframes.',
      }
    } else if (s >= 50) {
      return {
        status: 'Multiple Gaps',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        message: `${110 - s} points deducted. Multiple security controls require implementation.`,
        action: 'Prioritize implementing critical controls (5-point items) and create a remediation roadmap.',
      }
    } else if (s >= 0) {
      return {
        status: 'Significant Gaps',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        message: `${110 - s} points deducted. Significant security controls are not yet implemented.`,
        action: 'Begin comprehensive security program implementation. Consider engaging a security consultant.',
      }
    } else {
      return {
        status: 'Critical Gaps',
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-950/50',
        message: `Score is negative (${s}). Critical security controls are missing across multiple areas.`,
        action: 'Focus on high-value controls first. Your organization faces significant compliance and security risk.',
      }
    }
  }

  const guidance = score !== undefined ? getScoreGuidance(score) : null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-blue-200 dark:border-blue-800">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-base">What is SPRS Score?</CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            {!isOpen && (
              <CardDescription>
                Click to learn about SPRS scoring and what it means for your business
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Score-specific guidance */}
            {guidance && (
              <div className={`p-4 rounded-lg border ${guidance.bgColor}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${guidance.color}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${guidance.color}`}>{guidance.status}</span>
                      <Badge variant="outline" className={guidance.color}>Score: {score}</Badge>
                    </div>
                    <p className="text-sm mb-2">{guidance.message}</p>
                    <p className="text-sm font-medium">Recommended Action: {guidance.action}</p>
                  </div>
                </div>
              </div>
            )}

            {/* What is SPRS */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4" />
                SPRS Explained
              </h4>
              <p className="text-sm text-muted-foreground">
                <strong>SPRS (Supplier Performance Risk System)</strong> is a DoD system that tracks
                contractor cybersecurity compliance. Your SPRS score reflects how well you implement
                the 110 security controls in NIST SP 800-171.
              </p>
            </div>

            {/* Score Range */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" />
                Score Range: -203 to +110
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <span className="font-medium text-green-700 dark:text-green-300">110</span>
                    <span className="text-sm text-muted-foreground ml-2">All controls implemented - no deductions</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <div className="flex-1">
                    <span className="font-medium text-yellow-700 dark:text-yellow-300">1-109</span>
                    <span className="text-sm text-muted-foreground ml-2">Some controls not met - POA&M required for gaps</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <div className="flex-1">
                    <span className="font-medium text-orange-700 dark:text-orange-300">0</span>
                    <span className="text-sm text-muted-foreground ml-2">110 points deducted - all positive value lost</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <span className="font-medium text-red-700 dark:text-red-300">Below 0</span>
                    <span className="text-sm text-muted-foreground ml-2">Negative score - critical controls missing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* How it's calculated */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4" />
                How It&apos;s Calculated
              </h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Each of the 110 NIST 800-171 controls has a point value (1, 3, or 5 points)
                  based on its security importance. You start with 110 points and lose points
                  for each control that is NOT MET.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>5-point controls:</strong> Critical security requirements (e.g., multi-factor auth, encryption)</li>
                  <li><strong>3-point controls:</strong> Important security practices</li>
                  <li><strong>1-point controls:</strong> Supporting security measures</li>
                </ul>
                <p className="mt-2">
                  <strong>Example:</strong> If you fail to implement 5 critical (5-pt) controls and
                  10 standard (1-pt) controls, your score would be: 110 - 25 - 10 = <strong>75</strong>
                </p>
              </div>
            </div>

            {/* Why it matters */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Why This Matters for Your Business
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span><strong>Contract Eligibility:</strong> DoD contractors must submit their SPRS score. Many contracts require a minimum score or have POA&M requirements.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span><strong>CMMC Certification:</strong> For CMMC Level 2, you need to demonstrate compliance with all 110 controls to a C3PAO assessor.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span><strong>False Claims Risk:</strong> Submitting an inaccurate SPRS score can result in False Claims Act liability. Always be honest about your compliance status.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span><strong>Competitive Advantage:</strong> A higher score demonstrates security maturity and can differentiate you from competitors.</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
