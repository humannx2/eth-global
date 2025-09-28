'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { cn } from '@/lib/utils'
import Image from 'next/image'
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
import { NetworkSwitcher } from './NetworkSwitcher'
import { WalletConnectionDialog } from './WalletConnectionDialog'

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
  const router = useRouter()
  const { isConnected } = useAccount()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  // Auto-close sidebar on route changes (mobile only)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleProtectedNavigation = (path: string, itemName: string) => {
    if (isConnected) {
      router.push(path)
    } else {
      setPendingRedirect(path)
      setWalletDialogOpen(true)
    }
    setIsMobileMenuOpen(false)
  }

  const getDialogContent = () => {
    if (pendingRedirect === '/room') {
      return {
        title: "Connect Wallet to View Competitions",
        description: "Please connect your wallet to view and participate in fitness competitions."
      }
    } else if (pendingRedirect === '/room/create') {
      return {
        title: "Connect Wallet to Create Room", 
        description: "Please connect your wallet to create a fitness competition room."
      }
    }
    return {
      title: "Connect Wallet Required",
      description: "Please connect your wallet to access this feature."
    }
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src="/panda-logo.png" 
            alt="StakeFit Logo" 
            width={32} 
            height={32} 
            className="h-8 w-8 rounded-full"
          />
          <span className="text-xl font-bold">StakeFit</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          const requiresWallet = item.href !== '/'
          
          if (requiresWallet) {
            return (
              <button
                key={item.name}
                onClick={() => handleProtectedNavigation(item.href, item.name)}
                className={cn(
                  'w-full flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-left',
                  isActive 
                    ? 'bg-accent text-accent-foreground' 
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
                {item.name === 'Competitions' && (
                  <Badge variant="secondary" className="ml-auto">
                    New
                  </Badge>
                )}
              </button>
            )
          }
          
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
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Network & Wallet Section */}
      <div className="p-4 space-y-4">
        <NetworkSwitcher />
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
                <Image 
                  src="/panda-logo.png" 
                  alt="StakeFit Logo" 
                  width={24} 
                  height={24} 
                  className="h-6 w-6 rounded-full"
                />
                <span className="text-lg font-bold">StakeFit</span>
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

      {/* Wallet Connection Dialog */}
      <WalletConnectionDialog
        open={walletDialogOpen}
        onOpenChange={(open) => {
          setWalletDialogOpen(open)
          if (!open) {
            setPendingRedirect(null)
          }
        }}
        redirectTo={pendingRedirect || undefined}
        title={getDialogContent().title}
        description={getDialogContent().description}
      />
    </div>
  )
}