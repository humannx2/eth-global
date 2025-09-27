import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, CheckCircle, Zap, Shield } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Your Web3 application dashboard with type-safe smart contract interactions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Generated Types
            </CardTitle>
            <CardDescription>
              Smart contract types automatically generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <code className="text-xs bg-muted p-2 rounded block font-mono">
                src/lib/wagmi-generated.ts
              </code>
              <div className="flex gap-2">
                <Badge variant="secondary">Counter ABI</Badge>
                <Badge variant="secondary">Type Safe</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Wagmi Hooks
            </CardTitle>
            <CardDescription>
              React hooks for blockchain interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                • useReadContract<br/>
                • useWriteContract<br/>
                • useWaitForTransactionReceipt
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Web3 Security
            </CardTitle>
            <CardDescription>
              Type-safe contract interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                • TypeScript validation<br/>
                • ABI-based types<br/>
                • Runtime safety
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}