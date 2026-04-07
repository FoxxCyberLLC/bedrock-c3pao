import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()

  if (!session) {
    redirect('/login')
  }

  return (
    <AppShell
      user={{
        name: session.c3paoUser.name,
        email: session.c3paoUser.email,
        c3paoName: session.c3paoUser.c3paoName,
        isLeadAssessor: session.c3paoUser.isLeadAssessor,
      }}
    >
      {children}
    </AppShell>
  )
}
