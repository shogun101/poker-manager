'use client'

import { useState } from 'react'

interface ShareLinkProps {
  gameCode: string
}

export default function ShareLink({ gameCode }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)

  // Get the base URL from environment or window location
  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/game/${gameCode}`
    }
    return `https://poker-manager.vercel.app/game/${gameCode}`
  }

  const shareUrl = getShareUrl()

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
    <div className="border border-black/[0.24] border-dashed rounded-xl p-4 bg-[#F5F5F5]">
      <div className="flex flex-col items-center gap-2">
        {/* Header Text */}
        <p className="text-center text-black text-base font-normal tracking-[-1.12px] leading-[90%]" style={{ fontFamily: 'Geist, sans-serif' }}>
          Share this link to invite all your frens
        </p>

        {/* Link Container */}
        <div className="w-full bg-white border-2 border-black/[0.12] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          {/* URL Text */}
          <p className="text-black/[0.88] text-[13px] font-normal tracking-[-0.39px] leading-[90%] truncate flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            {shareUrl}
          </p>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="bg-black rounded-lg px-1.5 py-2 flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <span className="text-white/[0.88] text-[13px] font-normal tracking-[-0.39px] leading-[90%] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
