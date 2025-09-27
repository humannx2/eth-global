import { WalletConnect } from "@/components/WalletConnect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Web3 DApp
          </h1>
          <p className="text-gray-600 text-lg">
            Connect your wallet to get started with type-safe smart contract interactions
          </p>
        </div>
        
        <WalletConnect />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Generated Types Available
            </CardTitle>
            <CardDescription>
              Your smart contract types are automatically generated for full TypeScript safety
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Location:</span>
              </div>
              <code className="text-xs bg-muted p-3 rounded-md block font-mono border">
                src/lib/wagmi-generated.ts
              </code>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">Type Safe</Badge>
                <Badge variant="secondary">Auto Generated</Badge>
                <Badge variant="secondary">Wagmi Hooks</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
