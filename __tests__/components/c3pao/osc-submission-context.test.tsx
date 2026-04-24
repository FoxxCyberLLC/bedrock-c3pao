/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  OSCSubmissionContext,
  type OSCSubmissionContextData,
} from '@/components/c3pao/osc-submission-context'

function makeContext(
  overrides: Partial<OSCSubmissionContextData> = {},
): OSCSubmissionContextData {
  return {
    inheritedStatus: null,
    espMappings: [],
    evidenceMappings: [],
    ...overrides,
  }
}

describe('OSCSubmissionContext', () => {
  it('renders nothing when context is empty', () => {
    const { container } = render(
      <OSCSubmissionContext oscContext={makeContext()} engagementId="eng-1" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the inheritance claim badge when present', () => {
    render(
      <OSCSubmissionContext
        oscContext={makeContext({ inheritedStatus: 'PARTIAL' })}
        engagementId="eng-1"
      />,
    )
    expect(screen.getByText('OSC Self-Assessment Submission')).toBeInTheDocument()
    expect(screen.getByText('PARTIAL')).toBeInTheDocument()
  })

  it('lists dependent ESPs with provider name and inheritance type', () => {
    render(
      <OSCSubmissionContext
        oscContext={makeContext({
          espMappings: [
            {
              id: 'm1',
              espId: 'esp-1',
              providerName: 'Acme Cloud',
              inheritanceType: 'FULL',
              espResponsibility: 'Patches the OS',
              oscResponsibility: 'Configures policies',
            },
          ],
        })}
        engagementId="eng-1"
      />,
    )
    expect(screen.getByText('Dependent ESPs (1)')).toBeInTheDocument()
    expect(screen.getByText('Acme Cloud')).toBeInTheDocument()
    expect(screen.getByText('FULL')).toBeInTheDocument()
    expect(screen.getByText(/Patches the OS/)).toBeInTheDocument()
    expect(screen.getByText(/Configures policies/)).toBeInTheDocument()
  })

  it('renders evidence links pointing at the engagement evidence proxy', () => {
    render(
      <OSCSubmissionContext
        oscContext={makeContext({
          evidenceMappings: [
            {
              evidenceId: 'ev-9',
              fileName: 'ssp.pdf',
              fileUrl: null,
              mimeType: 'application/pdf',
              fileSize: 1024,
              description: 'System Security Plan',
              uploadedAt: '2026-04-01T00:00:00Z',
            },
          ],
        })}
        engagementId="eng-42"
      />,
    )
    const link = screen.getByRole('link', { name: /ssp\.pdf/ })
    expect(link).toHaveAttribute(
      'href',
      '/api/evidence/eng-42/ev-9/proxy',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })
})
