'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { formatCurrency, getFarcasterUsers, type FarcasterUser } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function PlayerView() {
  const { gameCode } = useParams()
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [farcasterUsers, setFarcasterUsers] = useState<Map<number, FarcasterUser>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!gameCode || !isSDKLoaded || !context) return

    const loadGameData = async () => {
      try {
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

        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameData.id)
          .eq('fid', context.user.fid)
          .single()

        if (playerData) {
          setPlayer(playerData)
        }

        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameData.id)
          .order('created_at', { ascending: true })

        if (playersData) {
          setAllPlayers(playersData)

          // Fetch Farcaster user data for all players
          const fids = playersData.map(p => p.fid)
          if (fids.length > 0) {
            const users = await getFarcasterUsers(fids)
            setFarcasterUsers(users)
          }
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
        setError('Failed to join game')
        return
      }

      setPlayer(newPlayer)
    } catch (err) {
      console.error('Error joining game:', err)
      setError('Something went wrong')
    } finally {
      setIsJoining(false)
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

  const totalPot = allPlayers.reduce((sum, p) => sum + p.total_deposited, 0)

  // Not joined yet
  if (!player) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 hover:text-black mb-6 cursor-pointer"
          >
            ← Back
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-black mb-1">{game.game_code}</h1>
            <p className="text-sm text-gray-600">Join this game</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-600 mb-1">Buy-in</p>
              <p className="text-sm font-medium text-black">
                {formatCurrency(game.buy_in_amount, game.currency)}
              </p>
            </div>
            <div className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-600 mb-1">Players</p>
              <p className="text-sm font-medium text-black">{allPlayers.length}</p>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleJoinGame}
            disabled={isJoining || game.status === 'ended'}
            className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {isJoining ? 'Joining...' : game.status === 'ended' ? 'Game Ended' : 'Join Game'}
          </button>
        </div>
      </div>
    )
  }

  // Player is in the game
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-600 hover:text-black mb-6 cursor-pointer"
        >
          ← Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-black mb-1">{game.game_code}</h1>
          <p className="text-sm text-gray-600 capitalize">{game.status}</p>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
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
        </div>

        {/* Your Stats */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-600 mb-1">Buy-ins</p>
              <p className="text-sm font-medium text-black">{player.total_buy_ins}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-3">
              <p className="text-xs text-gray-600 mb-1">Deposited</p>
              <p className="text-sm font-medium text-black">
                {formatCurrency(player.total_deposited, game.currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-3">
            Players ({allPlayers.length})
          </h2>
          <div className="space-y-2">
            {allPlayers.map((p) => {
              const fcUser = farcasterUsers.get(p.fid)
              return (
                <div
                  key={p.id}
                  className={`border rounded-md p-3 ${
                    p.id === player.id ? 'border-black' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={fcUser?.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.fid}`}
                      alt={fcUser?.username || `User ${p.fid}`}
                      width={32}
                      height={32}
                      className="rounded-full"
                      unoptimized
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">
                        {fcUser ? `@${fcUser.username}` : `User ${p.fid}`}
                        {p.id === player.id && ' (You)'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.total_buy_ins} buy-ins • {formatCurrency(p.total_deposited, game.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
