'use client'

/**
 * Composes the full dashboard shell:
 *
 *   <ShellErrorBoundary>
 *     <SidebarProvider>
 *       <AppSidebar />
 *       <SidebarInset>
 *         <AppHeader />
 *         <main>{children}</main>
 *       </SidebarInset>
 *       <CommandMenu />
 *     </SidebarProvider>
 *   </ShellErrorBoundary>
 *
 * Factored into its own client component so `app/(dashboard)/layout.tsx`
 * can stay a server component that resolves `requireAuth()` before
 * handing the session to the client.
 */

import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { CommandMenu } from '@/components/command-menu'
import { ShellErrorBoundary } from '@/components/shell-error-boundary'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useCommandMenu } from '@/hooks/use-command-menu'

interface AppShellProps {
  user: {
    name: string
    email: string
    c3paoName: string
    isLeadAssessor: boolean
  }
  /** Optional server-rendered notifications bell slot (Task 3 fills this). */
  notificationsSlot?: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ user, notificationsSlot, children }: AppShellProps) {
  const commandMenu = useCommandMenu()

  return (
    <ShellErrorBoundary>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <AppHeader
            user={user}
            onOpenCommandMenu={commandMenu.toggle}
            notificationsSlot={notificationsSlot}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
        <CommandMenu
          open={commandMenu.open}
          onOpenChange={commandMenu.setOpen}
          isLeadAssessor={user.isLeadAssessor}
        />
      </SidebarProvider>
    </ShellErrorBoundary>
  )
}
