'use client'

import { useAccount, useDisconnect, useConnections } from 'wagmi'
import { useFarcaster } from '@/lib/farcaster-provider'
import { formatUSDC } from '@/lib/contracts'
import { useUSDCBalance } from '@/hooks/usePokerEscrow'
import { useState } from 'react'
import WalletModal from './WalletModal'

export default function WalletConnect() {
  const { address: walletAddress, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { context } = useFarcaster()
  const connections = useConnections()

  const { balance: usdcBalance } = useUSDCBalance(walletAddress)
  const [showModal, setShowModal] = useState(false)

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Connect Wallet
        </button>
        <WalletModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      </>
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
          {connector && (
            <div className="text-gray-400 text-xs">
              via {connector.name}
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
