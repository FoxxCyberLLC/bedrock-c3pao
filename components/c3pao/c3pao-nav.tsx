'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Building2,
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  Settings,
  Users,
  BarChart3,
  Plug,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { c3paoLogout } from '@/app/actions/c3pao-auth'

type C3PAONavProps = {
  user: {
    name: string
    email: string
    c3paoName: string
    isLeadAssessor: boolean
  }
}

export function C3PAONav({ user }: C3PAONavProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Engagements', href: '/engagements', icon: FileText },
    { name: 'Workload', href: '/workload', icon: BarChart3 },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Connection', href: '/connection', icon: Plug },
    { name: 'Profile', href: '/profile', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  const handleLogout = () => {
    startTransition(async () => {
      await c3paoLogout()
    })
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/Designer-removebg-preview.png"
              alt="Foxx Cyber"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">C3PAO Portal</span>
              <span className="text-xs text-muted-foreground leading-tight">{user.c3paoName}</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{user.c3paoName}</p>
                    </div>
                    {user.isLeadAssessor && (
                      <span className="text-xs text-primary font-medium">Lead Assessor</span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isPending} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  {isPending ? 'Signing out...' : 'Sign Out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 flex gap-1 overflow-x-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
