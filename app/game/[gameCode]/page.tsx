'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PlayerView() {
  const { gameCode } = useParams()
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  // Load game and player data
  useEffect(() => {
    if (!gameCode || !isSDKLoaded || !context) return

    const loadGameData = async () => {
      try {
        // Fetch game by code
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_code', gameCode)
          .single()

        if (gameError || !gameData) {
          setError('Game not found')
          setIsLoading(false)
          return
        }

        setGame(gameData)

        // Check if user is already a player
        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameData.id)
          .eq('fid', context.user.fid)
          .single()

        if (playerData) {
          setPlayer(playerData)
        }

        // Fetch all players
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameData.id)
          .order('created_at', { ascending: true })

        if (playersData) {
          setAllPlayers(playersData)
        }
      } catch (err) {
        console.error('Error loading game:', err)
        setError('Failed to load game data')
      } finally {
        setIsLoading(false)
      }
    }

    loadGameData()

    // Subscribe to game and player changes
    const subscription = supabase
      .channel(`game-${gameCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `game_code=eq.${gameCode}`,
        },
        () => {
          loadGameData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        () => {
          loadGameData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [gameCode, isSDKLoaded, context])

  const handleJoinGame = async () => {
    if (!game || !context) return

    setIsJoining(true)
    setError('')

    try {
      // For now, we'll use a placeholder wallet address
      // In Phase B, we'll get the real wallet from Farcaster SDK
      const walletAddress = `0x${context.user.fid.toString().padStart(40, '0')}`

      const { data: newPlayer, error: joinError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          fid: context.user.fid,
          wallet_address: walletAddress,
        })
        .select()
        .single()

      if (joinError) {
        console.error('Join error:', joinError)
        setError('Failed to join game. You may have already joined.')
        return
      }

      setPlayer(newPlayer)
    } catch (err) {
      console.error('Error joining game:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsJoining(false)
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

  const totalPot = allPlayers.reduce((sum, p) => sum + p.total_deposited, 0)

  // If not joined yet, show join screen
  if (!player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🎲</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Join Poker Game
              </h1>
              <p className="text-gray-600">Game Code: {game.game_code}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Buy-in Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {game.buy_in_amount} {game.currency}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Current Players</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allPlayers.length}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Game Status</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {game.status}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleJoinGame}
              disabled={isJoining || game.status === 'ended'}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : game.status === 'ended' ? 'Game Ended' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Player is in the game - show game view
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Poker Game</h1>
              <p className="text-gray-600">Code: {game.game_code}</p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                game.status === 'waiting'
                  ? 'bg-yellow-100 text-yellow-800'
                  : game.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {game.status === 'waiting' && '⏳ Waiting'}
              {game.status === 'active' && '🎮 Active'}
              {game.status === 'ended' && '🏁 Ended'}
            </div>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Your Stats */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Buy-ins</p>
              <p className="text-2xl font-bold text-gray-900">
                {player.total_buy_ins}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Deposited</p>
              <p className="text-2xl font-bold text-gray-900">
                {player.total_deposited.toFixed(6)} {game.currency}
              </p>
            </div>
          </div>
        </div>

        {/* All Players */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            All Players ({allPlayers.length})
          </h2>
          <div className="space-y-3">
            {allPlayers.map((p) => (
              <div
                key={p.id}
                className={`border rounded-lg p-4 ${
                  p.id === player.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">
                        {p.id === player.id ? '👤' : '🎭'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        FID: {p.fid} {p.id === player.id && '(You)'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {p.total_buy_ins} buy-ins • {p.total_deposited.toFixed(6)}{' '}
                        {game.currency}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
