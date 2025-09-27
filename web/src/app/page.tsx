import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Code2, Zap, Shield, Github } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-6">
            <Badge variant="outline" className="mb-4">
              Web3 × TypeScript × shadcn/ui
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Type-Safe Web3 
              <span className="text-primary"> Development</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Build decentralized applications with automatically generated TypeScript types 
              from your smart contracts. Modern UI components included.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="text-lg">
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg">
              <Github className="mr-2 h-5 w-5" />
              View Source
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto mt-16">
          <Card className="text-center">
            <CardHeader>
              <Code2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <CardTitle>Auto-Generated Types</CardTitle>
              <CardDescription>
                Smart contract ABIs automatically converted to TypeScript types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted p-2 rounded block font-mono">
                wagmi generate
              </code>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>Wagmi Hooks</CardTitle>
              <CardDescription>
                React hooks for reading from and writing to smart contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>useReadContract</div>
                <div>useWriteContract</div>
                <div>useAccount</div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle>Modern UI</CardTitle>
              <CardDescription>
                Beautiful components built with shadcn/ui and Tailwind CSS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 justify-center flex-wrap">
                <Badge variant="secondary">shadcn/ui</Badge>
                <Badge variant="secondary">Tailwind</Badge>
                <Badge variant="secondary">Responsive</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Build?</CardTitle>
              <CardDescription className="text-lg">
                Connect your wallet and start interacting with smart contracts using type-safe hooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/dashboard">
                  Launch App
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
