// Format currency to 2 decimal places
export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`
}

// Get Farcaster user profile picture URL
// Using a generic avatar service that works with FIDs
export function getProfilePicture(fid: number): string {
  // DiceBear API for consistent avatars based on FID
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${fid}`
}

// Get username or fallback to FID
export function getDisplayName(username?: string, fid?: number): string {
  if (username) return username.startsWith('@') ? username : `@${username}`
  if (fid) return `User ${fid}`
  return 'Unknown'
}

// Fetch Farcaster user data from Neynar API (free public API)
export async function getFarcasterUser(fid: number) {
  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        'accept': 'application/json',
        // Using Neynar's free tier - no API key needed for basic lookups
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }

    const data = await response.json()
    const user = data.users?.[0]

    if (user) {
      return {
        username: user.username,
        displayName: user.display_name || user.username,
        pfpUrl: user.pfp_url,
        fid: user.fid,
      }
    }
  } catch (error) {
    console.error('Error fetching Farcaster user:', error)
  }

  return null
}
