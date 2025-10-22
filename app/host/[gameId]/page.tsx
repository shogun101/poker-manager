'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HostDashboard() {
  const { gameId } = useParams()
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Load game data
  useEffect(() => {
    if (!gameId || !isSDKLoaded || !context) return

    const loadGameData = async () => {
      try {
        // Fetch game
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single()

        if (gameError || !gameData) {
          setError('Game not found')
          return
        }

        // Verify user is the host
        if (gameData.host_fid !== context.user.fid) {
          setError('You are not the host of this game')
          return
        }

        setGame(gameData)

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)
          .order('created_at', { ascending: true })

        if (!playersError && playersData) {
          setPlayers(playersData)
        }
      } catch (err) {
        console.error('Error loading game:', err)
        setError('Failed to load game data')
      } finally {
        setIsLoading(false)
      }
    }

    loadGameData()

    // Subscribe to player changes in real-time
    const subscription = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          // Reload players when changes occur
          loadGameData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [gameId, isSDKLoaded, context])

  const handleStartGame = async () => {
    if (!game) return

    const { error } = await supabase
      .from('games')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', game.id)

    if (!error) {
      setGame({ ...game, status: 'active', started_at: new Date().toISOString() })
    }
  }

  const handleEndGame = async () => {
    if (!game) return

    const { error } = await supabase
      .from('games')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', game.id)

    if (!error) {
      setGame({ ...game, status: 'ended', ended_at: new Date().toISOString() })
    }
  }

  const handleAddBuyIn = async (playerId: string) => {
    if (!game) return

    const player = players.find((p) => p.id === playerId)
    if (!player) return

    const { error } = await supabase
      .from('players')
      .update({
        total_buy_ins: player.total_buy_ins + 1,
        total_deposited: player.total_deposited + game.buy_in_amount,
      })
      .eq('id', playerId)

    if (!error) {
      // Reload players
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true })

      if (data) setPlayers(data)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-center px-4">
          <h1 className="text-2xl font-bold mb-2">{error || 'Game not found'}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-purple-200 hover:text-white underline"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  const totalPot = players.reduce((sum, p) => sum + p.total_deposited, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
              <p className="text-gray-600">Managing your poker game</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono text-purple-600">
                {game.game_code}
              </div>
              <p className="text-xs text-gray-500">Share this code</p>
            </div>
          </div>

          {/* Game Info */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Buy-in</p>
              <p className="text-lg font-bold text-gray-900">
                {game.buy_in_amount} {game.currency}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Total Pot</p>
              <p className="text-lg font-bold text-gray-900">
                {totalPot.toFixed(6)} {game.currency}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Players</p>
              <p className="text-lg font-bold text-gray-900">{players.length}</p>
            </div>
          </div>

          {/* Game Status & Actions */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  game.status === 'waiting'
                    ? 'bg-yellow-100 text-yellow-800'
                    : game.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {game.status === 'waiting' && '⏳ Waiting for players'}
                {game.status === 'active' && '🎮 Game in progress'}
                {game.status === 'ended' && '🏁 Game ended'}
              </div>
            </div>
            {game.status === 'waiting' && (
              <button
                onClick={handleStartGame}
                disabled={players.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm"
              >
                Start Game
              </button>
            )}
            {game.status === 'active' && (
              <button
                onClick={handleEndGame}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm"
              >
                End Game
              </button>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Players</h2>

          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">No players yet</p>
              <p className="text-sm">Share the game code {game.game_code} to invite players</p>
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            FID: {player.fid}
                          </p>
                          <p className="text-xs text-gray-500">
                            {player.wallet_address.slice(0, 6)}...
                            {player.wallet_address.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Buy-ins: </span>
                          <span className="font-semibold">{player.total_buy_ins}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Deposited: </span>
                          <span className="font-semibold">
                            {player.total_deposited.toFixed(6)} {game.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                    {game.status === 'active' && (
                      <button
                        onClick={() => handleAddBuyIn(player.id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
                      >
                        + Buy-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
