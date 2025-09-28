'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Activity,
  BarChart3,
  Calendar,
  Target,
  TrendingUp,
  User,
  Zap,
  History,
  Settings
} from 'lucide-react'
import { WorkoutHistory } from '@/components/WorkoutHistory'

export default function WorkoutDashboardPage() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('history')

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-4">
              Connect your wallet to access your workout dashboard and history.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workout Dashboard</h1>
        <p className="text-gray-600">
          Track your fitness progress with AI-powered form analysis and 0G decentralized storage
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Achievements  
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          <WorkoutHistory />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Workouts</CardDescription>
                <CardTitle className="text-2xl">24</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12% from last month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Form Score</CardDescription>
                <CardTitle className="text-2xl text-green-600">87%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +5% improvement
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Reps</CardDescription>
                <CardTitle className="text-2xl">1,247</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  <Activity className="inline h-3 w-3 mr-1" />
                  This month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>AI Violations</CardDescription>
                <CardTitle className="text-2xl text-yellow-600">8</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  <Zap className="inline h-3 w-3 mr-1" />
                  Form improvements needed
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workout Trend</CardTitle>
              <CardDescription>
                Your workout frequency and form scores over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Analytics charts coming soon</p>
                  <p className="text-sm">Integrate with your 0G Storage workout data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Perfect Form</CardTitle>
                  <Badge variant="secondary">🏆</Badge>
                </div>
                <CardDescription>
                  Complete a workout with 100% form score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="font-medium">87% / 100%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Consistency King</CardTitle>
                  <Badge variant="outline">🔥</Badge>
                </div>
                <CardDescription>
                  Work out 7 days in a row
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Streak</span>
                  <span className="font-medium">4 / 7 days</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Rep Master</CardTitle>
                  <Badge variant="secondary">💪</Badge>
                </div>
                <CardDescription>
                  Complete 1,000 total reps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reps</span>
                  <span className="font-medium">847 / 1,000</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">AI Approved</CardTitle>
                  <Badge>🤖</Badge>
                </div>
                <CardDescription>
                  Get verified by 0G AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Completed</span>
                  <span className="font-medium">✓</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workout Preferences</CardTitle>
              <CardDescription>
                Customize your workout tracking and AI analysis settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Real-time AI Analysis</h4>
                  <p className="text-sm text-gray-600">
                    Get live form feedback during workouts
                  </p>
                </div>
                <Badge variant="secondary">0G AI</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Automatic Storage</h4>
                  <p className="text-sm text-gray-600">
                    Auto-save workout sessions to 0G Storage Network
                  </p>
                </div>
                <Badge variant="secondary">0G Storage</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Privacy Mode</h4>
                  <p className="text-sm text-gray-600">
                    Keep workout data encrypted on decentralized storage
                  </p>
                </div>
                <Badge variant="outline">Private</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Storage</CardTitle>
              <CardDescription>
                Manage your workout data stored on 0G Network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <Zap className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                <h4 className="font-medium mb-1">Powered by 0G Labs</h4>
                <p className="text-sm text-gray-600">
                  Your workout data is stored securely on the decentralized 0G Storage Network
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">24</p>
                  <p className="text-sm text-gray-600">Sessions Stored</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">100%</p>
                  <p className="text-sm text-gray-600">Data Integrity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}