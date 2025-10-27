'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import { formatUSDC } from '@/lib/contracts'
import { useUSDCBalance } from '@/hooks/usePokerEscrow'

export default function WalletConnect() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | undefined>()

  const { balance: usdcBalance } = useUSDCBalance(walletAddress)

  useEffect(() => {
    if (wallets.length > 0) {
      setWalletAddress(wallets[0].address as `0x${string}`)
    }
  }, [wallets])

  if (!ready) {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="font-semibold">{user?.farcaster?.username || 'Connected'}</div>
          {walletAddress && (
            <div className="text-gray-500 text-xs font-mono">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          )}
        </div>
        {usdcBalance !== undefined && (
          <div className="text-sm">
            <span className="text-gray-500">Balance: </span>
            <span className="font-semibold">${formatUSDC(usdcBalance)} USDC</span>
          </div>
        )}
        <button
          onClick={logout}
          className="ml-auto px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}
