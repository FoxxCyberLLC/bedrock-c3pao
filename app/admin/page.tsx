import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { AdminSettingsPanel } from '@/components/c3pao/admin-settings-panel'

export default async function AdminPage() {
  const session = await requireAuth()
  if (!session || !session.isLocalAdmin) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <AdminSettingsPanel userName={session.c3paoUser.name} />
    </div>
  )
}
