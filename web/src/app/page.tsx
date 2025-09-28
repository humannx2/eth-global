import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, Trophy, Target, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
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
            <Link href="/room" className="web3-gradient-btn btn-sm">
              <span className="web3-gradient-btn-content">
                View Competitions
              </span>
            </Link>
            <Link href="/room/create" className="web3-gradient-btn btn-sm">
              <span className="web3-gradient-btn-content">
                Create Room
              </span>
            </Link>
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
            <Link href="/room" className="web3-gradient-btn btn-lg">
              <span className="web3-gradient-btn-content">
                <Trophy className="mr-2 h-5 w-5" />
                View Competitions
              </span>
            </Link>
            <Link href="/room/create" className="web3-gradient-btn btn-lg">
              <span className="web3-gradient-btn-content">
                <Target className="mr-2 h-5 w-5" />
                Create Room
              </span>
            </Link>
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
    </div>
  );
}
