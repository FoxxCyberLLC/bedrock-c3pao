/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/app/actions/c3pao-readiness', () => ({
  uploadArtifact: vi.fn(),
  removeArtifact: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ArtifactUpload } from '@/components/c3pao/readiness/artifact-upload'
import * as actions from '@/app/actions/c3pao-readiness'
import { toast } from 'sonner'
import type { ReadinessArtifact } from '@/lib/readiness-types'

function artifact(overrides: Partial<ReadinessArtifact> = {}): ReadinessArtifact {
  return {
    id: 'a1',
    itemId: 'i1',
    filename: 'contract.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    description: null,
    uploadedBy: 'Jane',
    uploadedByEmail: 'jane@example.com',
    uploadedAt: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

describe('ArtifactUpload', () => {
  beforeEach(() => {
    vi.mocked(actions.uploadArtifact).mockReset()
    vi.mocked(actions.removeArtifact).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it('renders nothing when disabled (e.g. waived item)', () => {
    const { container } = render(
      <ArtifactUpload
        engagementId="e1"
        itemKey="contract_executed"
        artifacts={[]}
        canDelete={() => true}
        disabled
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows empty-state text when there are no artifacts', () => {
    render(
      <ArtifactUpload
        engagementId="e1"
        itemKey="contract_executed"
        artifacts={[]}
        canDelete={() => true}
      />,
    )
    expect(screen.getByText(/No artifacts uploaded yet/i)).toBeInTheDocument()
  })

  it('lists uploaded artifacts with filename and size', () => {
    render(
      <ArtifactUpload
        engagementId="e1"
        itemKey="contract_executed"
        artifacts={[artifact({ filename: 'signed.pdf', sizeBytes: 2048 })]}
        canDelete={() => true}
      />,
    )
    expect(screen.getByText('signed.pdf')).toBeInTheDocument()
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument()
  })

  it('rejects an oversized file client-side (no server call)', async () => {
    render(
      <ArtifactUpload
        engagementId="e1"
        itemKey="contract_executed"
        artifacts={[]}
        canDelete={() => true}
      />,
    )
    const input = screen.getByTestId('artifact-file-input') as HTMLInputElement
    const big = new File(['x'.repeat(10)], 'big.pdf', {
      type: 'application/pdf',
    })
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 })
    await act(async () => {
      fireEvent.change(input, { target: { files: [big] } })
    })
    expect(actions.uploadArtifact).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
  })

  it('rejects disallowed mime types', async () => {
    render(
      <ArtifactUpload
        engagementId="e1"
        itemKey="contract_executed"
        artifacts={[]}
        canDelete={() => true}
      />,
    )
    const input = screen.getByTestId('artifact-file-input') as HTMLInputElement
    const bad = new File(['bin'], 'bad.exe', { type: 'application/x-msdownload' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [bad] } })
    })
    expect(actions.uploadArtifact).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
  })

  it('uploads a valid file via the server action', async () => {
    vi.mocked(actions.uploadArtifact).mockResolvedValue({
      success: true,
      data: { id: 'a2' },
    })
    const onChange = vi.fn()
    render(
      <ArtifactUpload
        engagementId="eng-1"
        itemKey="contract_executed"
        artifacts={[]}
        canDelete={() => true}
        onChange={onChange}
      />,
    )
    const input = screen.getByTestId('artifact-file-input') as HTMLInputElement
    const ok = new File(['hello'], 'hi.pdf', { type: 'application/pdf' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [ok] } })
    })
    expect(actions.uploadArtifact).toHaveBeenCalledWith(
      'eng-1',
      'contract_executed',
      expect.any(FormData),
    )
    expect(onChange).toHaveBeenCalled()
  })

  it('hides the remove button when canDelete returns false', () => {
    render(
      <ArtifactUpload
        engagementId="e1"
        itemKey="contract_executed"
        artifacts={[artifact({ filename: 'other.pdf' })]}
        canDelete={() => false}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /Remove other\.pdf/i }),
    ).not.toBeInTheDocument()
  })
})
