import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fids = searchParams.get('fids')

  console.log('[Farcaster API] Received request for FIDs:', fids)

  if (!fids) {
    console.error('[Farcaster API] No FIDs provided')
    return NextResponse.json({ error: 'FIDs required' }, { status: 400 })
  }

  const apiKey = process.env.NEYNAR_API_KEY

  if (!apiKey) {
    console.error('[Farcaster API] NEYNAR_API_KEY not found in environment')
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    )
  }

  try {
    const neynarUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids}`
    console.log('[Farcaster API] Calling Neynar:', neynarUrl)

    // Using Neynar's API with authentication
    const response = await fetch(neynarUrl, {
      headers: {
        accept: 'application/json',
        api_key: apiKey,
      },
    })

    console.log('[Farcaster API] Neynar response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Farcaster API] Neynar API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Neynar API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Farcaster API] Neynar raw response:', JSON.stringify(data, null, 2))

    // Transform the response to a simpler format
    const users = data.users?.map((user: any) => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfpUrl: user.pfp_url,
      bio: user.profile?.bio?.text,
    })) || []

    console.log('[Farcaster API] Transformed users:', users.length, 'users')

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[Farcaster API] Error fetching Farcaster users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
