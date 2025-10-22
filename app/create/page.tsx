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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 px-4">
      <main className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center text-sm"
            >
              ← Back
            </button>
            <div className="text-5xl mb-4">🎰</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Game
            </h1>
            <p className="text-gray-600">
              Set up your poker game settings
            </p>
          </div>

          {/* Host Info */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">You are the host</p>
            <p className="font-semibold text-gray-900">
              FID: {context.user.fid}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Buy-in Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buy-in Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Amount each player pays per buy-in
              </p>
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrency('USDC')}
                  className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                    currency === 'USDC'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  USDC
                </button>
                <button
                  onClick={() => setCurrency('ETH')}
                  className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                    currency === 'ETH'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  ETH
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateGame}
              disabled={isCreating || !buyInAmount}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Game...' : 'Create Game'}
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Next steps:</strong> After creating the game, you'll get a 6-digit code. Share this code with players so they can join!
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
