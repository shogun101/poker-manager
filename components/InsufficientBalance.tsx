'use client'

import { useAccount } from 'wagmi'

interface InsufficientBalanceProps {
  currentBalance: number
  requiredAmount: number
  onClose: () => void
}

export default function InsufficientBalance({
  currentBalance,
  requiredAmount,
  onClose,
}: InsufficientBalanceProps) {
  const { address } = useAccount()
  const shortfall = requiredAmount - currentBalance

  const getCoinbasePayUrl = () => {
    if (!address) return '#'

    const destinationWallets = [{
      address: address,
      assets: ['USDC'],
      supportedNetworks: ['base']
    }]

    return `https://pay.coinbase.com/buy?destinationWallets=${encodeURIComponent(JSON.stringify(destinationWallets))}`
  }

  const handleCopyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black rounded-2xl p-6 max-w-md w-full shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        {/* USDC Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-blue-500 border-4 border-black flex items-center justify-center text-4xl">
            💵
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-[family-name:var(--font-lilita)] text-center mb-6 text-black">
          Insufficient USDC Balance
        </h2>

        {/* Balance Comparison */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center p-3 bg-red-50 border-2 border-red-500 rounded-xl">
            <span className="font-[family-name:var(--font-margarine)] text-black">Your Balance:</span>
            <span className="font-[family-name:var(--font-lilita)] text-red-600 text-xl">
              ${currentBalance.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 border-2 border-black rounded-xl">
            <span className="font-[family-name:var(--font-margarine)] text-black">Required:</span>
            <span className="font-[family-name:var(--font-lilita)] text-black text-xl">
              ${requiredAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-blue-50 border-2 border-blue-500 rounded-xl">
            <span className="font-[family-name:var(--font-margarine)] text-black">You Need:</span>
            <span className="font-[family-name:var(--font-lilita)] text-blue-600 text-xl">
              +${shortfall.toFixed(2)} USDC
            </span>
          </div>
        </div>

        {/* Wallet Address */}
        {address && (
          <div className="mb-6">
            <p className="text-sm font-[family-name:var(--font-margarine)] text-gray-600 mb-2">
              Your Wallet:
            </p>
            <div className="flex items-center gap-2 p-2 bg-gray-50 border-2 border-black rounded-lg">
              <span className="font-mono text-xs text-black truncate flex-1">
                {address}
              </span>
              <button
                onClick={handleCopyAddress}
                className="px-3 py-1 bg-gray-200 border-2 border-black rounded text-xs font-[family-name:var(--font-margarine)] hover:bg-gray-300 transition-colors"
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Top Up Button */}
          <a
            href={getCoinbasePayUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-primary text-white rounded-xl px-6 py-4 font-[family-name:var(--font-lilita)] text-lg border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-center uppercase"
            style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}
          >
            💳 Top Up Wallet
          </a>

          {/* Return Home Button */}
          <button
            onClick={onClose}
            className="w-full bg-white text-black rounded-xl px-6 py-3 font-[family-name:var(--font-margarine)] text-base border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            ← Return to Game
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-4 font-[family-name:var(--font-margarine)]">
          You'll need USDC on Base network to join this game
        </p>
      </div>
    </div>
  )
}
