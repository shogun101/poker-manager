import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fids = searchParams.get('fids')

  if (!fids) {
    return NextResponse.json({ error: 'FIDs required' }, { status: 400 })
  }

  const apiKey = process.env.NEYNAR_API_KEY

  if (!apiKey) {
    console.error('NEYNAR_API_KEY not found in environment')
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Using Neynar's API with authentication
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids}`,
      {
        headers: {
          accept: 'application/json',
          api_key: apiKey,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Neynar API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform the response to a simpler format
    const users = data.users?.map((user: any) => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url,
      bio: user.profile?.bio?.text,
    })) || []

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching Farcaster users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}
