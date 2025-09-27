'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  Trophy, 
  Target, 
  Home,
  Plus
} from 'lucide-react'
import { WalletWidget } from './WalletWidget'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Competitions', href: '/room', icon: Trophy },
  { name: 'Create Room', href: '/room/create', icon: Plus },
]

interface AppSidebarProps {
  children: React.ReactNode
}

export function AppSidebar({ children }: AppSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Auto-close sidebar on route changes (mobile only)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

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
      {/* Desktop Sidebar - Only on lg+ screens */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-background">
        <SidebarContent />
      </div>

      {/* Mobile Header - Only on smaller screens */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo and Menu Button Combined */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 p-2">
                <Trophy className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">FitStake</span>
                <Menu className="h-4 w-4 ml-2" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Add top padding on mobile to account for fixed header */}
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}