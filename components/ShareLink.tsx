'use client'

import { useState } from 'react'

interface ShareLinkProps {
  gameCode: string
}

export default function ShareLink({ gameCode }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)

  // Get the base URL from environment or window location
  const getWebUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/game/${gameCode}`
    }
    // Fallback for server-side rendering
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poker-manager-murex.vercel.app'
    return `${baseUrl}/game/${gameCode}`
  }

  // Get the domain without protocol for Farcaster deep link
  const getDomain = () => {
    if (typeof window !== 'undefined') {
      return window.location.host
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poker-manager-murex.vercel.app'
    return baseUrl.replace('https://', '').replace('http://', '')
  }

  // Create Farcaster deep link that opens the app directly
  // Format: https://farcaster.xyz/~/mini-apps/launch?domain=yourdomain.com&path=/game/ABCD123
  const getFarcasterDeepLink = () => {
    const domain = getDomain()
    const path = `/game/${gameCode}`
    return `https://farcaster.xyz/~/mini-apps/launch?domain=${domain}&path=${encodeURIComponent(path)}`
  }

  const webUrl = getWebUrl()
  const farcasterDeepLink = getFarcasterDeepLink()
  
  // Use Farcaster deep link as the share URL - this opens Farcaster app directly
  const shareUrl = farcasterDeepLink

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="border-4 border-black rounded-2xl p-4 bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
      <div className="flex flex-col gap-3">
        {/* Header Text */}
        <p className="text-center text-black text-base font-[family-name:var(--font-margarine)]">
          🔗 Share this link to invite all your frens
        </p>

        {/* Link Container */}
        <div className="w-full bg-gray-50 border-2 border-black rounded-xl px-3 py-3 flex items-center justify-between gap-2">
          {/* URL Text */}
          <p className="text-black text-sm font-[family-name:var(--font-margarine)] truncate flex-1">
            {shareUrl}
          </p>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="bg-primary text-white rounded-lg px-4 py-2 font-[family-name:var(--font-lilita)] text-sm border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all uppercase cursor-pointer"
            style={{ textShadow: '0 1px 0 rgba(0,0,0,1)' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Helper text for Farcaster users */}
        <p className="text-xs text-gray-500 text-center font-[family-name:var(--font-margarine)]">
          🚀 Opens Farcaster app directly on mobile
        </p>
      </div>
    </div>
  )
}
