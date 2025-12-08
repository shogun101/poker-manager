'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { Currency } from '@/lib/types'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAccount, useConnect, useChainId } from 'wagmi'
import { useCreateGame } from '@/hooks/usePokerEscrow'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { POKER_ESCROW_ADDRESS } from '@/lib/contracts'
import { base, baseSepolia } from 'wagmi/chains'
import { supabase } from '@/lib/supabase'

function CreateGameContent() {
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Wagmi and blockchain hooks
  const { address: walletAddress, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const chainId = useChainId()
  const { createGame: createGameOnChain, isPending: isCreatingOnChain, error: blockchainError } = useCreateGame()

  // Log chain configuration on mount
  useEffect(() => {
    console.log('🔗 CHAIN CONFIGURATION:')
    console.log('  Active Chain ID:', chainId)
    console.log('  Chain Name:', chainId === base.id ? 'Base Mainnet' : chainId === baseSepolia.id ? 'Base Sepolia' : 'Unknown')
    console.log('  Escrow Address:', POKER_ESCROW_ADDRESS)
    console.log('  NEXT_PUBLIC_USE_MAINNET:', process.env.NEXT_PUBLIC_USE_MAINNET)
  }, [])

  // Form state
  const [buyInAmount, setBuyInAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USDC')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  // Track the last blockchain error we've shown to avoid showing stale errors
  const lastShownErrorRef = useRef<Error | null>(null)

  // Pre-fill buy-in amount from URL params
  useEffect(() => {
    const buyInParam = searchParams.get('buyIn')
    if (buyInParam) {
      setBuyInAmount(buyInParam)
    }
  }, [searchParams])

  // Handle blockchain errors
  // Only show each unique blockchain error once
  useEffect(() => {
    if (blockchainError && blockchainError !== lastShownErrorRef.current) {
      console.error('⛓️ Blockchain error:', blockchainError)
      lastShownErrorRef.current = blockchainError
      
      // Only show blockchain errors if we're currently in a creation flow
      if (isCreating || isCreatingOnChain) {
        setError('Blockchain transaction failed. The game was created but may not be on-chain yet.')
        setIsCreating(false)
      }
    }
  }, [blockchainError, isCreating, isCreatingOnChain])

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
    console.log('🎮 CREATE GAME CLICKED')

    // Prevent multiple simultaneous creation attempts
    if (isCreating || isCreatingOnChain) {
      console.log('⚠️ Already creating game, ignoring duplicate click')
      return
    }

    // Clear any previous errors
    setError('')
    // Reset the last shown error ref when user explicitly clicks create again
    lastShownErrorRef.current = null

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

    console.log('✅ All validations passed')
    setIsCreating(true)

    try {
      const gameCode = generateGameCode()
      console.log('🎲 Generated game code:', gameCode)

      // Step 1: Create game in database first (to get the ID)
      console.log('📝 Creating game with:', {
        host_fid: context.user.fid,
        game_code: gameCode,
        buy_in_amount: parseFloat(buyInAmount),
        currency: currency,
      })

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

      console.log('📊 Database response:', { game, dbError })

      if (dbError) {
        console.error('❌ Database error:', dbError)
        setError('Failed to create game. Please try again.')
        setIsCreating(false)
        return
      }

      if (!game) {
        console.error('❌ No game data returned')
        setError('Failed to create game. No data returned.')
        setIsCreating(false)
        return
      }

      console.log('✅ Game created in DB:', game)

      // Step 2: Create game on blockchain using the database ID
      console.log('⛓️ Creating game on blockchain with ID:', game.id)
      createGameOnChain(game.id)

      // Don't wait for blockchain - redirect immediately
      // The blockchain transaction will complete in the background
      console.log('🚀 Redirecting to:', `/game/${game.game_code}`)
      router.push(`/game/${game.game_code}`)
    } catch (err) {
      console.error('❌ Caught error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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
      {/* Purple Header */}
      <div className="bg-primary text-white px-4 py-4 shadow-[0_2px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-white/80 font-[family-name:var(--font-margarine)] text-base"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-[family-name:var(--font-lilita)] tracking-tight" style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}>
            Create Game
          </h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        <div className="border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          {/* Buy-in Amount in USDC */}
          <div className="mb-4">
            <label className="block text-base font-[family-name:var(--font-margarine)] text-black mb-2">
              Buy-in Amount (USDC)
            </label>
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-black rounded-xl bg-white">
              <span className="text-lg font-[family-name:var(--font-margarine)] text-black">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(e.target.value)}
                placeholder="10.00"
                className="flex-1 text-lg font-[family-name:var(--font-margarine)] outline-none bg-white text-black placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* USDC-only Info Banner */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-6">
            <p className="text-sm text-blue-800 font-[family-name:var(--font-margarine)]">
              💰 All buy-ins and payouts are processed in USDC on Base
            </p>
          </div>

          {/* Wallet Connection Section */}
          {!isConnected ? (
            <div>
              <div className="mb-4">
                <h3 className="text-base font-[family-name:var(--font-lilita)] text-black mb-2">Connect Wallet to Continue</h3>
                <p className="text-sm text-gray-600 mb-4 font-[family-name:var(--font-margarine)]">
                  Choose how you want to connect your wallet
                </p>
              </div>

              <div className="space-y-3">
                {/* Farcaster Wallet Button */}
                {connectors.find(c => c.name.toLowerCase().includes('farcaster')) && (
                  <button
                    onClick={() => connect({ connector: connectors.find(c => c.name.toLowerCase().includes('farcaster'))! })}
                    className="w-full flex items-center gap-3 p-4 border-2 border-black rounded-xl hover:bg-gray-50 transition-all text-left"
                  >
                    <span className="text-2xl">🟣</span>
                    <div className="flex-1">
                      <p className="text-base font-[family-name:var(--font-margarine)] text-black">Connect Farcaster Wallet</p>
                      <p className="text-sm text-gray-500 font-[family-name:var(--font-margarine)]">Use your Farcaster Frame wallet</p>
                    </div>
                  </button>
                )}

                {/* External Wallet Button */}
                <div className="w-full">
                  <ConnectButton />
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Wallet Connected Status */}
              <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                <p className="text-sm text-green-800 font-[family-name:var(--font-margarine)]">
                  ✅ Wallet connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-xl px-3 py-2 mb-4 font-[family-name:var(--font-margarine)]">
                  {error}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateGame}
                disabled={isCreating || isCreatingOnChain || !buyInAmount}
                className="w-full py-4 bg-primary text-white text-lg font-[family-name:var(--font-lilita)] rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 cursor-pointer"
                style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}
              >
                {isCreatingOnChain ? 'Creating on Blockchain...' : isCreating ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CreateGame() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    }>
      <CreateGameContent />
    </Suspense>
  )
}
