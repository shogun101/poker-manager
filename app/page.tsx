'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { isSDKLoaded, context, isLoading } = useFarcaster()
  const router = useRouter()
  const [gameCode, setGameCode] = useState('')

  // Show loading state while Farcaster SDK initializes
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-xl">Loading Poker Manager...</div>
      </div>
    )
  }

  // Show error if SDK failed to load
  if (!isSDKLoaded || !context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-center px-4">
          <h1 className="text-2xl font-bold mb-2">Unable to load Poker Manager</h1>
          <p className="text-purple-200">Please open this app inside Farcaster</p>
        </div>
      </div>
    )
  }

  const handleCreateGame = () => {
    router.push('/create')
  }

  const handleJoinGame = () => {
    if (gameCode.trim().length === 6) {
      router.push(`/game/${gameCode.toUpperCase()}`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 px-4">
      <main className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">♠️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Poker Manager
            </h1>
            <p className="text-gray-600">
              Manage live poker games with automated settlements
            </p>
          </div>

          {/* User Info */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Logged in as</p>
            <p className="font-semibold text-gray-900">
              FID: {context.user.fid}
            </p>
          </div>

          {/* Create Game Button */}
          <button
            onClick={handleCreateGame}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg mb-6"
          >
            Create New Game
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Join Game */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Join Existing Game
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase text-center text-lg font-mono"
              />
              <button
                onClick={handleJoinGame}
                disabled={gameCode.length !== 6}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
