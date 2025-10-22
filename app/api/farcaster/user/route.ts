import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fids = searchParams.get('fids')

  if (!fids) {
    return NextResponse.json({ error: 'FIDs required' }, { status: 400 })
  }

  try {
    // Using Neynar's public API
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids}`,
      {
        headers: {
          accept: 'application/json',
          // Neynar allows unauthenticated requests for basic user lookups
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`)
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
