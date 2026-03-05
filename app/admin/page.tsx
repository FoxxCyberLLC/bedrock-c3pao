import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { AdminPanel } from '@/components/c3pao/admin-panel'

export default async function AdminPage() {
  const session = await requireAuth()
  if (!session || !session.isLocalAdmin) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <AdminPanel userName={session.c3paoUser.name} />
    </div>
  )
}
