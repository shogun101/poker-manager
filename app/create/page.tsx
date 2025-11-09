'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Currency } from '@/lib/types'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useConnect } from 'wagmi'
import { useCreateGame } from '@/hooks/usePokerEscrow'
import WalletModal from '@/components/WalletModal'

export default function CreateGame() {
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  // Wagmi and blockchain hooks
  const { address: walletAddress, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { createGame: createGameOnChain, isPending: isCreatingOnChain } = useCreateGame()

  // Form state
  const [buyInAmount, setBuyInAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USDC')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [showWalletModal, setShowWalletModal] = useState(false)

  // Generate a random 6-character game code
  const generateGameCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars like 0, O, I, 1
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateGame = async () => {
    // Validation
    if (!buyInAmount || parseFloat(buyInAmount) <= 0) {
      setError('Please enter a valid buy-in amount')
      return
    }

    if (!isSDKLoaded || !context) {
      setError('Farcaster SDK not loaded')
      return
    }

    // Check wallet connection
    if (!isConnected || !walletAddress) {
      setError('Please connect your wallet first using the buttons below')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const gameCode = generateGameCode()

      // Step 1: Create game in database first (to get the ID)
      const { data: game, error: dbError } = await supabase
        .from('games')
        .insert({
          host_fid: context.user.fid,
          game_code: gameCode,
          buy_in_amount: parseFloat(buyInAmount),
          currency: currency,
          status: 'waiting',
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        setError('Failed to create game. Please try again.')
        return
      }

      // Step 2: Create game on blockchain using the database ID
      console.log('Creating game on blockchain...')
      await createGameOnChain(game.id)

      // Wait for blockchain confirmation
      while (isCreatingOnChain) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log('Game created on blockchain')

      // Redirect to game page where host will buy-in (same flow as other players)
      router.push(`/game/${game.game_code}`)
    } catch (err) {
      console.error('Error creating game:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isSDKLoaded || !context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-600 hover:text-black mb-6 cursor-pointer"
        >
          ← Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black mb-1">Create Game</h1>
          <p className="text-sm text-gray-600">Set buy-in amount in USDC</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Buy-in Amount in USDC */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Buy-in Amount (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400"
            />
          </div>

          {/* USDC-only Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              💰 All buy-ins and payouts are processed in USDC on Base
            </p>
          </div>

          {/* Wallet Connection Section */}
          {!isConnected ? (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Connect Wallet to Continue</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Choose how you want to connect your wallet to create the game
                </p>
              </div>

              <div className="space-y-3">
                {/* Farcaster Wallet Button */}
                {connectors.find(c => c.name.toLowerCase().includes('farcaster')) && (
                  <button
                    onClick={() => connect({ connector: connectors.find(c => c.name.toLowerCase().includes('farcaster'))! })}
                    className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-black hover:bg-gray-50 transition-all text-left"
                  >
                    <span className="text-2xl">🟣</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">Connect Farcaster Wallet</p>
                      <p className="text-xs text-gray-500">Use your Farcaster Frame wallet</p>
                    </div>
                  </button>
                )}

                {/* External Wallet Button */}
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-black hover:bg-gray-50 transition-all text-left"
                >
                  <span className="text-2xl">💼</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">Use External Wallet</p>
                    <p className="text-xs text-gray-500">MetaMask, Coinbase, WalletConnect, etc.</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Wallet Connected Status */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-800">
                  ✅ Wallet connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
                  {error}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateGame}
                disabled={isCreating || isCreatingOnChain || !buyInAmount}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {isCreatingOnChain ? 'Creating on blockchain...' : isCreating ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          )}
        </div>

        {/* Wallet Modal for External Wallets */}
        <WalletModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnectSuccess={() => {
            setShowWalletModal(false)
            setError('')
          }}
        />
      </div>
    </div>
  )
}
