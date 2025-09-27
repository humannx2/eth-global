import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, Trophy, Target, Users } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">FitStake</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost">
              <Link href="/room">View Competitions</Link>
            </Button>
            <Button asChild>
              <Link href="/room/create">Create Room</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-6">
            <Badge variant="outline" className="mb-4">
              🏋️‍♂️ Fitness × Web3 × AI Verification
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              FitStake
              <span className="text-primary"> Competitions</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Verifiable on-chain fitness competitions. AI agents verify real-world workouts 
              and distribute rewards automatically. Stake. Move. Win.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="text-lg">
              <Link href="/room">
                <Trophy className="mr-2 h-5 w-5" />
                View Competitions
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg">
              <Link href="/room/create">
                <Target className="mr-2 h-5 w-5" />
                Create Room
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="mb-2">AI Verification</CardTitle>
                <CardDescription>
                  MediaPipe pose analysis with LLM refinement ensures authentic workouts
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="mb-2">On-Chain Stakes</CardTitle>
                <CardDescription>
                  Transparent competition with automatic reward distribution to winners
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
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
  );
}
