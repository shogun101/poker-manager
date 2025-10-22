// Format currency to 2 decimal places
export function formatCurrency(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`
}

// Get Farcaster user profile picture URL
export function getProfilePicture(fid: number): string {
  return `https://res.cloudinary.com/merkle-manufactory/image/fetch/c_fill,f_jpg,w_168/${encodeURIComponent(
    `https://i.seadn.io/s/raw/files/${fid}.png?auto=format&dpr=1&w=384`
  )}`
}

// Get username or fallback to FID
export function getDisplayName(username?: string, fid?: number): string {
  if (username) return `@${username}`
  if (fid) return `#${fid}`
  return 'Unknown'
}
