// Format currency to 2 decimal places
export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`
}

// Farcaster user data type
export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  bio?: string
}

// Fetch Farcaster user data from our API route
export async function getFarcasterUsers(fids: number[]): Promise<Map<number, FarcasterUser>> {
  const userMap = new Map<number, FarcasterUser>()

  if (fids.length === 0) {
    console.log('getFarcasterUsers: No FIDs provided')
    return userMap
  }

  try {
    console.log('Fetching Farcaster users for FIDs:', fids)
    const response = await fetch(`/api/farcaster/user?fids=${fids.join(',')}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch Farcaster users:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        fids
      })
      throw new Error(`Failed to fetch users: ${response.status}`)
    }

    const data = await response.json()
    console.log('Farcaster API response:', data)

    if (!data.users || !Array.isArray(data.users)) {
      console.error('Invalid response format from Farcaster API:', data)
      return userMap
    }

    data.users.forEach((user: FarcasterUser) => {
      console.log('Adding user to map:', user.fid, user.username)
      userMap.set(user.fid, user)
    })

    console.log('Successfully fetched', userMap.size, 'Farcaster users')
  } catch (error) {
    console.error('Error fetching Farcaster users:', error)
  }

  return userMap
}
