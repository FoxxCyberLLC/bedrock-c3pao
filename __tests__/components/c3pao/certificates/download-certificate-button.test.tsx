/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DownloadCertificateButton } from '@/components/c3pao/certificates/download-certificate-button'

describe('DownloadCertificateButton', () => {
  it('links to the certificate route for the engagement', () => {
    render(<DownloadCertificateButton engagementId="eng-123" />)
    const link = screen.getByRole('link', { name: /download certificate/i })
    expect(link).toHaveAttribute(
      'href',
      '/api/c3pao/engagements/eng-123/certificate',
    )
    expect(link).toHaveAttribute('download')
  })

  it('renders a DRAFT badge by default', () => {
    render(<DownloadCertificateButton engagementId="eng-123" />)
    expect(screen.getByText(/^draft$/i)).toBeInTheDocument()
  })

  it('hides the DRAFT badge when showDraftBadge=false', () => {
    render(
      <DownloadCertificateButton
        engagementId="eng-123"
        showDraftBadge={false}
      />,
    )
    expect(screen.queryByText(/^draft$/i)).not.toBeInTheDocument()
  })

  it('respects a custom label', () => {
    render(<DownloadCertificateButton engagementId="eng-9" label="PDF" />)
    expect(screen.getByRole('link', { name: /pdf/i })).toBeInTheDocument()
  })
})
