import { NextResponse } from 'next/server'
import axios from 'axios'

const ASI_API_URL = 'https://api.asi1.ai/v1/chat/completions'
const ASI_API_KEY = process.env.ASI_API_KEY

export async function POST(request: Request) {
  if (!ASI_API_KEY) {
    return NextResponse.json(
      { error: 'ASI API key is not configured on the server.' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ASI_API_KEY}`,
    }

    const response = await axios.post(ASI_API_URL, body, { headers })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error proxying to ASI API:', error)
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(
        { error: 'Error from ASI API', details: error.response.data },
        { status: error.response.status }
      )
    }
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
