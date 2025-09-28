// Legacy API route - redirects to new 0G-powered endpoint
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Forward request to the new 0G-powered endpoint
    const response = await fetch(`${req.nextUrl.origin}/api/0g/generate-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'X-Legacy-Redirect': 'true',
        'X-New-Endpoint': '/api/0g/generate-config'
      }
    })

  } catch (error) {
    console.error('❌ Legacy API route error:', error)
    return NextResponse.json({ 
      error: 'Request forwarding failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}