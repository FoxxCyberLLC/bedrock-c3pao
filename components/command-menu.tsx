'use client'

/**
 * Global command palette (Cmd+K / Ctrl+K).
 *
 * Searches engagements, team members, and navigation pages in a single
 * unified list. Falls back to a recent-engagements list from localStorage
 * when the Go API is unreachable (offline VDI scenario).
 *
 * Data is fetched on first open and cached until the palette is closed.
 * Closing + reopening refreshes.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Folder, User as UserIcon, Clock } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { getC3PAOEngagements, getC3PAOTeam } from '@/app/actions/c3pao-dashboard'
import {
  buildEngagementCommands,
  buildTeamCommands,
  getPageCommands,
  readRecentEngagements,
  type CommandItem as CommandItemData,
  type EngagementRef,
  type TeamMemberRef,
} from '@/lib/shell/command-search'

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isLeadAssessor: boolean
}

export function CommandMenu({ open, onOpenChange, isLeadAssessor }: CommandMenuProps) {
  const router = useRouter()
  const [engagements, setEngagements] = useState<CommandItemData[]>([])
  const [team, setTeam] = useState<CommandItemData[]>([])
  const [recent, setRecent] = useState<CommandItemData[]>([])
  const [loading, setLoading] = useState(false)

  /** Load engagements, team, and recent list when the palette opens. */
  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function load() {
      // Batch all state updates into the async flow so React doesn't trigger
      // a cascading render from a synchronous setState at effect-start.
      const recentItems = readRecentEngagements()
      const recentCommands = buildEngagementCommands(recentItems).map((item) => ({
        ...item,
        group: 'Recent' as const,
      }))
      if (cancelled) return
      setRecent(recentCommands)
      setLoading(true)

      try {
        const [engResult, teamResult] = await Promise.all([
          getC3PAOEngagements(),
          getC3PAOTeam(),
        ])
        if (cancelled) return
        if (engResult.success && engResult.data) {
          const engRefs: EngagementRef[] = engResult.data.map((e) => ({
            id: String(e.id ?? ''),
            packageName: String(e.packageName ?? 'Unknown package'),
            organizationName: String(e.organizationName ?? 'Unknown organization'),
            status: String(e.status ?? ''),
          }))
          setEngagements(buildEngagementCommands(engRefs))
        }
        if (teamResult.success && teamResult.data) {
          const teamRefs: TeamMemberRef[] = teamResult.data.map((m) => ({
            id: String(m.id ?? ''),
            name: String(m.name ?? ''),
            email: String(m.email ?? ''),
          }))
          setTeam(buildTeamCommands(teamRefs))
        }
      } catch {
        // Offline or API error — keep the recent list visible, clear the live data.
        if (!cancelled) {
          setEngagements([])
          setTeam([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open])

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router],
  )

  const pages = getPageCommands(isLeadAssessor)

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to an engagement, team member, or page. Press ⌘K / Ctrl+K to toggle."
    >
      <CommandInput placeholder="Search engagements, team, or pages..." />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Loading...' : 'No results found.'}
        </CommandEmpty>

        {recent.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recent.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.id} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Clock className="opacity-60" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {engagements.length > 0 && (
          <>
            <CommandGroup heading="Engagements">
              {engagements.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.id} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Folder className="opacity-60" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {team.length > 0 && (
          <>
            <CommandGroup heading="Team">
              {team.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.id} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <UserIcon className="opacity-60" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Pages">
          {pages.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.id} ${item.keywords.join(' ')}`}
              onSelect={() => handleSelect(item.href)}
            >
              <div className="flex flex-col">
                <span>{item.title}</span>
                {item.subtitle && (
                  <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
