'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useFarcaster } from '@/lib/farcaster-provider'
import { formatUSDC } from '@/lib/contracts'
import { useUSDCBalance } from '@/hooks/usePokerEscrow'

export default function WalletConnect() {
  const { address: walletAddress, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { context } = useFarcaster()

  const { balance: usdcBalance } = useUSDCBalance(walletAddress)

  const handleConnect = () => {
    if (connectors[0]) {
      connect({ connector: connectors[0] })
    }
  }

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
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
          <div className="font-semibold">{context?.user?.username || 'Connected'}</div>
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
          onClick={() => disconnect()}
          className="ml-auto px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}
