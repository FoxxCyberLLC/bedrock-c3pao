import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { C3PAONav } from '@/components/c3pao/c3pao-nav'

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
    <div className="min-h-screen bg-background">
      <C3PAONav
        user={{
          name: session.c3paoUser.name,
          email: session.c3paoUser.email,
          c3paoName: session.c3paoUser.c3paoName,
          isLeadAssessor: session.c3paoUser.isLeadAssessor,
        }}
      />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
