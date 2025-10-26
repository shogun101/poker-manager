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

  if (fids.length === 0) return userMap

  try {
    const response = await fetch(`/api/farcaster/user?fids=${fids.join(',')}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch Farcaster users:', response.status, errorText)
      throw new Error('Failed to fetch users')
    }

    const data = await response.json()

    data.users?.forEach((user: FarcasterUser) => {
      userMap.set(user.fid, user)
    })
  } catch (error) {
    console.error('Error fetching Farcaster users:', error)
  }

  return userMap
}
