'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { formatUSDC } from '@/lib/contracts'
import { useUSDCBalance } from '@/hooks/usePokerEscrow'

export default function WalletConnect() {
  const { address: walletAddress, isConnected } = useAccount()
  const { balance: usdcBalance } = useUSDCBalance(walletAddress)

  return (
    <div className="flex flex-col gap-2">
      <ConnectButton
        accountStatus="avatar"
        chainStatus="icon"
        showBalance={false}
      />

      {isConnected && usdcBalance !== undefined && (
        <div className="text-sm text-center">
          <span className="text-gray-500">USDC Balance: </span>
          <span className="font-semibold">${formatUSDC(usdcBalance)}</span>
        </div>
      )}
    </div>
  )
}
