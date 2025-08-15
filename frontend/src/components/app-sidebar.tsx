import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/supabaseClient'
import { User } from '@supabase/supabase-js'
import {
  Calculator,
  FileText,
  Home,
  LogOut,
  Settings,
  BarChart,
  Clock,
  Building2,
  Users,
  ChevronsUpDown,
  LucideIcon,
  FileCheck,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrganizationSwitcher } from './organization-switcher'
import { EntitySwitcher } from './entity-switcher'
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

interface MenuItem {
  title: string
  url: string
  icon: LucideIcon
}

// Menu items.
const items: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Entities',
    url: '/entities',
    icon: Building2,
  },
  {
    title: 'Self Assessment',
    url: '/self-assessment',
    icon: FileCheck,
  },
  {
    title: 'Calculations',
    url: '/calculations',
    icon: Calculator,
  },
  {
    title: 'Team',
    url: '/team',
    icon: Users,
  },
  {
    title: 'Templates',
    url: '/templates',
    icon: FileText,
  },
  {
    title: 'History',
    url: '/history',
    icon: Clock,
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: BarChart,
  },
]

const bottomItems: MenuItem[] = [
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!user?.email) return 'U'
    const parts = user.email.split('@')[0].split('.')
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return user.email.substring(0, 2).toUpperCase()
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <OrganizationSwitcher />
        <Separator className="my-2" />
        <div className="px-2">
          <div className="text-xs text-muted-foreground mb-2">Client Entity</div>
          <EntitySwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                    <AvatarFallback className="rounded-lg">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || 'Loading...'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                      <AvatarFallback className="rounded-lg">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email || 'Loading...'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
