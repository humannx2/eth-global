'use client'

import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { WalletWidget } from '@/components/WalletWidget'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Home, Menu } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { address, isConnected } = useAccount()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <Home className="h-4 w-4 text-primary-foreground" />
              </div>
              Web3 DApp
            </Link>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Home
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button variant="ghost" size="sm">
                  Portfolio
                </Button>
              </Link>
            </div>
          </div>

          {/* Right side - Wallet Connection */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/">Home</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/portfolio">Portfolio</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Wallet Connection Widget */}
            <WalletWidget />
          </div>
        </div>
      </div>
    </nav>
  )
}