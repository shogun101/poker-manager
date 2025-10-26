'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game } from '@/lib/types'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { isSDKLoaded, context, isLoading } = useFarcaster()
  const router = useRouter()
  const [gameCode, setGameCode] = useState('')
  const [myGames, setMyGames] = useState<Game[]>([])

  // Load user's games
  useEffect(() => {
    if (!context) return

    const loadMyGames = async () => {
      const { data: games } = await supabase
        .from('games')
        .select('*')
        .eq('host_fid', context.user.fid)
        .order('created_at', { ascending: false })
        .limit(5)

      if (games) setMyGames(games)
    }

    loadMyGames()
  }, [context])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isSDKLoaded || !context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Please open this app inside Farcaster</p>
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

  const handleOpenGame = (game: Game) => {
    router.push(`/host/${game.id}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black mb-1">Poker Manager</h1>
          <p className="text-sm text-gray-600">
            {context.user.username || `@${context.user.fid}`}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={handleCreateGame}
            className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 cursor-pointer transition-colors"
          >
            Create New Game
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="Game code"
              maxLength={6}
              className="flex-1 px-3 py-2 text-sm text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent uppercase placeholder:text-gray-400"
            />
            <button
              onClick={handleJoinGame}
              disabled={gameCode.length !== 6}
              className="px-4 py-2 bg-white text-black text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        {/* My Games */}
        {myGames.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-900 mb-3">Your Games</h2>
            <div className="space-y-2">
              {myGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleOpenGame(game)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:border-gray-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-black">{game.game_code}</p>
                      <p className="text-xs text-gray-500">
                        {game.buy_in_amount} {game.currency} • {game.status}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
