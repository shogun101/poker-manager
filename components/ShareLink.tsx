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
    <div className="border border-black/24 border-dashed rounded-xl p-4 bg-[#F5F5F5]">
      <div className="flex flex-col items-center gap-2">
        {/* Header Text */}
        <p className="text-center text-black text-base font-normal tracking-[-1.12px] leading-[90%]" style={{ fontFamily: 'Geist, sans-serif' }}>
          Share this link to invite all your frens
        </p>

        {/* Link Container */}
        <div className="w-full bg-white border-2 border-black/12 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          {/* URL Text */}
          <p className="text-black/88 text-[13px] font-normal tracking-[-0.39px] leading-[90%] truncate flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            {shareUrl}
          </p>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="bg-black rounded-lg px-1.5 py-2 flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors"
          >
            <span className="text-white/88 text-[13px] font-normal tracking-[-0.39px] leading-[90%] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>
        </div>

        {/* Helper text for Farcaster users */}
        <p className="text-xs text-gray-500 text-center mt-1">
          🚀 This link opens Farcaster app directly on mobile
        </p>
      </div>
    </div>
  )
}
