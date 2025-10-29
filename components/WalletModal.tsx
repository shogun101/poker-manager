'use client'

import { useConnect, useAccount, Connector } from 'wagmi'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnectSuccess?: () => void
}

export default function WalletModal({ isOpen, onClose, onConnectSuccess }: WalletModalProps) {
  const { connect, connectors, isPending, error } = useConnect()
  const { isConnected } = useAccount()
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null)

  useEffect(() => {
    if (isConnected && onConnectSuccess) {
      onConnectSuccess()
      onClose()
    }
  }, [isConnected, onConnectSuccess, onClose])

  if (!isOpen) return null

  const getConnectorIcon = (connector: Connector) => {
    const name = connector.name.toLowerCase()

    if (name.includes('farcaster')) {
      return '🟣'
    } else if (name.includes('metamask')) {
      return '🦊'
    } else if (name.includes('coinbase')) {
      return '🔵'
    } else if (name.includes('walletconnect')) {
      return '🔗'
    } else if (name.includes('injected')) {
      return '🔌'
    }
    return '💼'
  }

  const getConnectorDescription = (connector: Connector) => {
    const name = connector.name.toLowerCase()

    if (name.includes('farcaster')) {
      return 'Use your Farcaster wallet'
    } else if (name.includes('metamask')) {
      return 'Connect with MetaMask'
    } else if (name.includes('coinbase')) {
      return 'Coinbase Smart Wallet'
    } else if (name.includes('walletconnect')) {
      return 'Scan with mobile wallet'
    } else if (name.includes('injected')) {
      return 'Browser extension wallet'
    }
    return 'External wallet'
  }

  const handleConnect = async (connector: Connector) => {
    setSelectedConnector(connector)
    try {
      await connect({ connector })
    } catch (err) {
      console.error('Connection error:', err)
      setSelectedConnector(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Choose how you want to connect your wallet to play poker
          </p>

          {/* Connector List */}
          <div className="space-y-2">
            {connectors.map((connector) => {
              const isLoading = isPending && selectedConnector?.id === connector.id

              return (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-black hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="text-2xl">{getConnectorIcon(connector)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">{connector.name}</p>
                    <p className="text-xs text-gray-500">{getConnectorDescription(connector)}</p>
                  </div>
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                {error.message || 'Failed to connect wallet'}
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Tip:</strong> If Farcaster wallet has issues, try using MetaMask or Coinbase Wallet for faster transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
