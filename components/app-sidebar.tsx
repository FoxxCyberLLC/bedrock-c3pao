'use client'

/**
 * Bedrock C3PAO application sidebar.
 *
 * Wraps the Shadcn `Sidebar` primitive. Nav items are pulled from
 * `lib/shell/nav-items.ts` and filtered by `isLeadAssessor`.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  Folder,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Plug,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { getVisibleNavItems, isActiveRoute } from '@/lib/shell/nav-items'

/** Map of Lucide icon name strings (from nav-items.ts) to the actual components. */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Inbox,
  Folder,
  LayoutGrid,
  Calendar,
  BarChart3,
  Users,
  ShieldCheck,
  CheckSquare,
  ShieldAlert,
  Plug,
  Settings,
}

interface AppSidebarProps {
  user: {
    name: string
    email: string
    c3paoName: string
    isLeadAssessor: boolean
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const items = getVisibleNavItems(user.isLeadAssessor)

  // Partition items into logical groups for visual hierarchy.
  const overviewHrefs = new Set(['/', '/inbox'])
  const workHrefs = new Set(['/engagements', '/board', '/calendar'])
  const teamHrefs = new Set(['/workload', '/team'])
  const complianceHrefs = new Set(['/certificates', '/qa', '/coi'])
  const systemHrefs = new Set(['/connection', '/profile'])

  const overview = items.filter((i) => overviewHrefs.has(i.href))
  const work = items.filter((i) => workHrefs.has(i.href))
  const teamGroup = items.filter((i) => teamHrefs.has(i.href))
  const compliance = items.filter((i) => complianceHrefs.has(i.href))
  const system = items.filter((i) => systemHrefs.has(i.href))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">C3PAO Portal</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.c3paoName}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Overview" items={overview} pathname={pathname} />
        <NavGroup label="Work" items={work} pathname={pathname} />
        <NavGroup label="Team" items={teamGroup} pathname={pathname} />
        <NavGroup label="Compliance" items={compliance} pathname={pathname} />
        <NavGroup label="System" items={system} pathname={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="truncate font-medium text-foreground">{user.name}</div>
          <div className="truncate">{user.email}</div>
          {user.isLeadAssessor && (
            <div className="mt-0.5 inline-flex items-center rounded-sm bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
              Lead Assessor
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

interface NavGroupProps {
  label: string
  items: ReturnType<typeof getVisibleNavItems>
  pathname: string | null
}

function NavGroup({ label, items, pathname }: NavGroupProps) {
  if (items.length === 0) return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? LayoutDashboard
            const active = isActiveRoute(pathname, item.href)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
