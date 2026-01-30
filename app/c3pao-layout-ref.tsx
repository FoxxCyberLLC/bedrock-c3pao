import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'C3PAO Portal - Bedrock CMMC',
  description: 'C3PAO assessment portal',
}

export default function C3PAOLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
