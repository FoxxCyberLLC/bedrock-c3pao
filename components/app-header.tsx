'use client'

/**
 * Bedrock C3PAO application header (sticky top bar inside SidebarInset).
 *
 * Contains:
 *   - Sidebar toggle (hamburger / collapse)
 *   - Global search / command palette trigger (Cmd+K)
 *   - Theme toggle
 *   - Notifications bell (filled in by Task 3)
 *   - User menu (name + sign out)
 *
 * Lives INSIDE `<SidebarInset>` so it reflows when the sidebar collapses.
 */

import { useTransition, type ReactNode } from 'react'
import { LogOut, Search, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { c3paoLogout } from '@/app/actions/c3pao-auth'

interface AppHeaderProps {
  user: {
    name: string
    email: string
    c3paoName: string
    isLeadAssessor: boolean
  }
  /** Click handler for the command palette trigger (typically toggles Cmd+K state). */
  onOpenCommandMenu: () => void
  /** Optional slot for the notifications bell; Task 3 fills this. */
  notificationsSlot?: ReactNode
}

export function AppHeader({
  user,
  onOpenCommandMenu,
  notificationsSlot,
}: AppHeaderProps) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await c3paoLogout()
    })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />

      <button
        type="button"
        onClick={onOpenCommandMenu}
        className="group relative ml-2 hidden h-9 w-64 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:flex"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Search...</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onOpenCommandMenu}
        className="ml-2 md:hidden"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        {notificationsSlot}
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline max-w-[12ch] truncate">
                {user.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate">{user.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user.c3paoName}
                </span>
                {user.isLeadAssessor && (
                  <span className="mt-1 text-xs font-medium text-primary">
                    Lead Assessor
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isPending}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isPending ? 'Signing out...' : 'Sign Out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
