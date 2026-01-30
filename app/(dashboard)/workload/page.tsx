import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WorkloadDashboard } from '@/components/workload-dashboard'

export const metadata = {
  title: 'Team Workload - C3PAO Dashboard',
  description: 'View assessment workload distribution across your team',
}

export default async function WorkloadPage() {
  const user = await requireAuth()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Workload</h1>
        <p className="text-muted-foreground">
          View assessment distribution and workload across your team members
        </p>
      </div>

      <WorkloadDashboard />
    </div>
  )
}
