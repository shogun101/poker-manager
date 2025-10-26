'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Currency } from '@/lib/types'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateGame() {
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  // Form state
  const [buyInAmount, setBuyInAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USDC')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

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

    setIsCreating(true)
    setError('')

    try {
      const gameCode = generateGameCode()

      // Create game in database
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

      // Redirect to host dashboard
      router.push(`/host/${game.id}`)
    } catch (err) {
      console.error('Error creating game:', err)
      setError('Something went wrong. Please try again.')
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
          <p className="text-sm text-gray-600">Set buy-in amount and currency</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Buy-in Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Buy-in Amount
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

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Currency
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrency('USDC')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors cursor-pointer ${
                  currency === 'USDC'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-gray-400'
                }`}
              >
                USDC
              </button>
              <button
                onClick={() => setCurrency('ETH')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors cursor-pointer ${
                  currency === 'ETH'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:border-gray-400'
                }`}
              >
                ETH
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreateGame}
            disabled={isCreating || !buyInAmount}
            className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>
    </div>
  )
}
