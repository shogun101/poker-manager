'use client'

import { useState } from 'react'

interface ShareLinkProps {
  gameCode: string
}

export default function ShareLink({ gameCode }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)

  // Get Farcaster deep link for Mini App
  const getFarcasterDeepLink = () => {
    // Extract domain without https://
    const domain = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace('https://', '').replace('http://', '')
      : 'poker-manager-murex.vercel.app'

    const path = `/game/${gameCode}`

    // Farcaster deep link format for Mini Apps
    // Note: path should NOT be encoded for Farcaster deep links
    return `https://farcaster.xyz/~/mini-apps/launch?domain=${domain}&path=${path}`
  }

  const shareUrl = getFarcasterDeepLink()

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

        {/* Helper text */}
        <p className="text-xs text-gray-500 text-center font-[family-name:var(--font-margarine)]">
          Share this link to invite players to join
        </p>
      </div>
    </div>
  )
}
