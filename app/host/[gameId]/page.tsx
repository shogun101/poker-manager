'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { formatCurrency, getProfilePicture, getDisplayName } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'

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
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single()

        if (gameError || !gameData) {
          setError('Game not found')
          return
        }

        if (gameData.host_fid !== context.user.fid) {
          setError('You are not the host of this game')
          return
        }

        setGame(gameData)

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">{error || 'Game not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-black hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  const totalPot = players.reduce((sum, p) => sum + p.total_deposited, 0)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-600 hover:text-black mb-6"
        >
          ← Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-black mb-1">{game.game_code}</h1>
          <p className="text-sm text-gray-600">Host Dashboard</p>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-600 mb-1">Buy-in</p>
            <p className="text-sm font-medium text-black">
              {formatCurrency(game.buy_in_amount, game.currency)}
            </p>
          </div>
          <div className="border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-600 mb-1">Pot</p>
            <p className="text-sm font-medium text-black">
              {formatCurrency(totalPot, game.currency)}
            </p>
          </div>
          <div className="border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-600 mb-1">Players</p>
            <p className="text-sm font-medium text-black">{players.length}</p>
          </div>
        </div>

        {/* Game Actions */}
        <div className="mb-6">
          {game.status === 'waiting' && (
            <button
              onClick={handleStartGame}
              disabled={players.length === 0}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Start Game
            </button>
          )}
          {game.status === 'active' && (
            <button
              onClick={handleEndGame}
              className="w-full px-4 py-2.5 bg-white text-black text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              End Game
            </button>
          )}
          {game.status === 'ended' && (
            <div className="text-sm text-gray-600 text-center py-2">Game ended</div>
          )}
        </div>

        {/* Players */}
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-3">
            Players {players.length > 0 && `(${players.length})`}
          </h2>

          {players.length === 0 ? (
            <div className="border border-gray-200 rounded-md p-8 text-center">
              <p className="text-sm text-gray-600 mb-1">No players yet</p>
              <p className="text-xs text-gray-500">Share code {game.game_code} to invite players</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="border border-gray-200 rounded-md p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Image
                        src={getProfilePicture(player.fid)}
                        alt={`User ${player.fid}`}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {getDisplayName(undefined, player.fid)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {player.total_buy_ins} buy-ins • {formatCurrency(player.total_deposited, game.currency)}
                        </p>
                      </div>
                    </div>
                    {game.status === 'active' && (
                      <button
                        onClick={() => handleAddBuyIn(player.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
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
