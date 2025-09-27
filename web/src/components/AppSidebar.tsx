'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  Trophy, 
  Target, 
  Users, 
  BarChart3, 
  Settings,
  Home,
  Plus
} from 'lucide-react'
import { WalletWidget } from './WalletWidget'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Competitions', href: '/room', icon: Trophy },
  { name: 'Create Room', href: '/room/create', icon: Plus },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Portfolio', href: '/portfolio', icon: Users },
]

interface AppSidebarProps {
  children: React.ReactNode
}

export function AppSidebar({ children }: AppSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center space-x-2">
          <Trophy className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">FitStake</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                isActive 
                  ? 'bg-accent text-accent-foreground' 
                  : 'text-muted-foreground'
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name}
              {item.name === 'Competitions' && (
                <Badge variant="secondary" className="ml-auto">
                  New
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Wallet Section */}
      <div className="p-4">
        <WalletWidget />
      </div>
    </div>
  )

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-background">
        <SidebarContent />
      </div>

      {/* Mobile Menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <div className="lg:hidden">
          {/* Mobile Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href="/" className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">FitStake</span>
            </Link>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
          </div>
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}