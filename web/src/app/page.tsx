'use client'

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, Trophy, Target, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { WalletConnectionDialog } from "@/components/WalletConnectionDialog";

export default function HomePage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // Handle URL parameters for automatic wallet dialog display
  useEffect(() => {
    const showWalletDialog = searchParams.get('showWalletDialog');
    const redirectTo = searchParams.get('redirectTo');
    
    if (showWalletDialog === 'true' && redirectTo && !isConnected) {
      setPendingRedirect(redirectTo);
      setWalletDialogOpen(true);
      // Clean up URL parameters
      router.replace('/', { scroll: false });
    }
  }, [searchParams, isConnected, router]);

  const handleProtectedNavigation = (path: string, actionName: string) => {
    if (isConnected) {
      router.push(path);
    } else {
      setPendingRedirect(path);
      setWalletDialogOpen(true);
    }
  };

  const getDialogContent = () => {
    if (pendingRedirect === '/room') {
      return {
        title: "Connect Wallet to View Competitions",
        description: "Please connect your wallet to view and participate in fitness competitions."
      };
    } else if (pendingRedirect === '/room/create') {
      return {
        title: "Connect Wallet to Create Room",
        description: "Please connect your wallet to create a fitness competition room."
      };
    }
    return {
      title: "Connect Wallet Required",
      description: "Please connect your wallet to access this feature."
    };
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
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
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="secondary-accent-hover"
              onClick={() => handleProtectedNavigation('/room', 'View Competitions')}
            >
              View Competitions
            </Button>
            <Button 
              className="bg-[#E94C4C] hover:bg-[#d63c3c] text-white border-none"
              onClick={() => handleProtectedNavigation('/room/create', 'Create Room')}
            >
              Create Room
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="web3-badge mb-4">
              <span className="web3-badge-text">
                🏋️‍♂️ Fitness × Web3 × AI
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              StakeFit
              {/* <span className="text-primary"> Competitions</span> */}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transparent, Trustless Fitness competitions with real crypto rewards. 
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stake. Move. Win.
              </p>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg btn-secondary-accent"
              onClick={() => handleProtectedNavigation('/room', 'View Competitions')}
            >
              <Trophy className="mr-2 h-5 w-5" />
              View Competitions
            </Button>
            <Button 
              size="lg" 
              className="text-lg bg-[#E94C4C] hover:bg-[#d63c3c] text-white border-none"
              onClick={() => handleProtectedNavigation('/room/create', 'Create Room')}
            >
              <Target className="mr-2 h-5 w-5" />
              Create Room
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="feature-card">
              <Card className="feature-card-content text-center border-0">
                <CardContent className="pt-6">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle className="mb-2">AI Verification</CardTitle>
                  <CardDescription>
                    MediaPipe pose analysis with LLM refinement ensures authentic workouts
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="feature-card">
              <Card className="feature-card-content text-center border-0">
                <CardContent className="pt-6">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle className="mb-2">Smart Rewards</CardTitle>
                  <CardDescription>
                    Top 3 finishers share the prize pool: 🥇 50% • 🥈 30% • 🥉 20%
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="feature-card">
              <Card className="feature-card-content text-center border-0">
                <CardContent className="pt-6">
                  <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle className="mb-2">Social Fitness</CardTitle>
                  <CardDescription>
                    Compete with friends in invite-only rooms with custom stakes
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Connection Dialog */}
      <WalletConnectionDialog
        open={walletDialogOpen}
        onOpenChange={(open) => {
          setWalletDialogOpen(open);
          if (!open) {
            setPendingRedirect(null);
          }
        }}
        redirectTo={pendingRedirect || undefined}
        title={getDialogContent().title}
        description={getDialogContent().description}
      />
    </div>
  );
}
