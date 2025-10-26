'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { formatCurrency, getFarcasterUsers, type FarcasterUser } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import ShareLink from '@/components/ShareLink'

export default function HostDashboard() {
  const { gameId } = useParams()
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [farcasterUsers, setFarcasterUsers] = useState<Map<number, FarcasterUser>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [chipCounts, setChipCounts] = useState<Record<string, string>>({})
  const [isCalculatingSettlement, setIsCalculatingSettlement] = useState(false)
  const fetchedFidsRef = useRef<Set<number>>(new Set())

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

          // Initialize chip counts from database if game is active or ended
          if (gameData.status !== 'waiting') {
            const counts: Record<string, string> = {}
            playersData.forEach(p => {
              // Use saved final_chip_count if exists, otherwise use total_deposited
              counts[p.id] = p.final_chip_count > 0
                ? p.final_chip_count.toString()
                : p.total_deposited.toString()
            })
            setChipCounts(counts)
          }

          // Only fetch Farcaster data for new FIDs we haven't fetched yet
          const fids = playersData.map(p => p.fid)
          const newFids = fids.filter(fid => !fetchedFidsRef.current.has(fid))

          if (newFids.length > 0) {
            // Mark as fetched immediately to prevent duplicate requests
            newFids.forEach(fid => fetchedFidsRef.current.add(fid))

            const newUsers = await getFarcasterUsers(newFids)
            // Merge with existing users
            setFarcasterUsers(prev => new Map([...prev, ...newUsers]))
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
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log('Real-time update received:', payload)
          // Immediately reload game data on any player change
          await loadGameData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          console.log('Game update received:', payload)
          await loadGameData()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [gameId, isSDKLoaded, context])

  const handleStartGame = async () => {
    if (!game) return

    // Start the game
    const { error } = await supabase
      .from('games')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', game.id)

    if (!error) {
      setGame({ ...game, status: 'active', started_at: new Date().toISOString() })
    }
  }

  const handleCalculateSettlement = async () => {
    if (!game) return
    setIsCalculatingSettlement(true)

    const payouts = calculatePayouts()

    // Update all players with their final chip counts and payouts
    const updates = payouts.map(({ player, chips, payout }) =>
      supabase
        .from('players')
        .update({
          final_chip_count: chips,
          payout_amount: payout
        })
        .eq('id', player.id)
    )

    await Promise.all(updates)

    // Mark game as ended
    const { error } = await supabase
      .from('games')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', game.id)

    if (!error) {
      setGame({ ...game, status: 'ended', ended_at: new Date().toISOString() })
    }

    setIsCalculatingSettlement(false)
  }

  const handleEditSettlement = async () => {
    if (!game) return

    // Reopen the game for editing
    const { error } = await supabase
      .from('games')
      .update({ status: 'active' })
      .eq('id', game.id)

    if (!error) {
      setGame({ ...game, status: 'active' })
    }
  }

  const calculatePayouts = () => {
    const totalPot = players.reduce((sum, p) => sum + p.total_deposited, 0)
    let totalChips = 0

    // Calculate total chips
    players.forEach(p => {
      const chips = parseFloat(chipCounts[p.id] || '0')
      totalChips += chips
    })

    if (totalChips === 0) return []

    // Calculate each player's payout based on their chip proportion
    return players.map(p => {
      const chips = parseFloat(chipCounts[p.id] || '0')
      const chipProportion = chips / totalChips
      const payout = totalPot * chipProportion
      const profit = payout - p.total_deposited

      return {
        player: p,
        chips,
        payout,
        profit,
        deposited: p.total_deposited
      }
    }).sort((a, b) => b.profit - a.profit)
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
          className="text-sm text-gray-600 hover:text-black mb-6 cursor-pointer"
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

        {/* Share Link */}
        <div className="mb-6">
          <ShareLink gameCode={game.game_code} />
        </div>

        {/* Game Actions */}
        <div className="mb-6">
          {game.status === 'waiting' && (
            <button
              onClick={handleStartGame}
              disabled={players.length === 0 && !context}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Start Game
            </button>
          )}
        </div>

        {/* Settlement Section - Show when game is active or ended */}
        {game.status !== 'waiting' && players.length > 0 && (
          <div className="mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-black">Game Settlement</h3>
                {game.status === 'ended' && (
                  <button
                    onClick={handleEditSettlement}
                    className="text-xs text-gray-600 hover:text-black cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Chip Count Inputs */}
              <div className="space-y-3 mb-4">
                {players.map((player) => {
                  const fcUser = farcasterUsers.get(player.fid)
                  return (
                    <div key={player.id} className="flex items-center gap-3">
                      <Image
                        src={fcUser?.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.fid}`}
                        alt={fcUser?.username || `User ${player.fid}`}
                        width={28}
                        height={28}
                        className="rounded-full flex-shrink-0"
                        unoptimized
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-black truncate">
                          {fcUser ? `@${fcUser.username}` : `User ${player.fid}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Deposited: {formatCurrency(player.total_deposited, game.currency)}
                        </p>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={chipCounts[player.id] || ''}
                          onChange={(e) => setChipCounts({ ...chipCounts, [player.id]: e.target.value })}
                          disabled={game.status === 'ended'}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-600"
                          placeholder="Final chips"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Settlement Summary */}
              {calculatePayouts().length > 0 && (
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Settlement</h4>
                  <div className="space-y-1.5">
                    {calculatePayouts().map(({ player, chips, payout, profit }) => {
                      const fcUser = farcasterUsers.get(player.fid)
                      const isWinner = profit > 0
                      const isLoser = profit < 0

                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                            isWinner ? 'bg-green-50' : isLoser ? 'bg-red-50' : 'bg-gray-50'
                          }`}
                        >
                          <span className="font-medium text-black truncate flex-1">
                            {fcUser ? `@${fcUser.username}` : `User ${player.fid}`}
                          </span>
                          <span className={`font-medium ${isWinner ? 'text-green-700' : isLoser ? 'text-red-700' : 'text-gray-600'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit, game.currency)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Calculate Button */}
              {game.status === 'active' && (
                <button
                  onClick={handleCalculateSettlement}
                  disabled={isCalculatingSettlement || players.some(p => !chipCounts[p.id] || parseFloat(chipCounts[p.id]) < 0)}
                  className="w-full px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {isCalculatingSettlement ? 'Calculating...' : 'Calculate & Save Settlement'}
                </button>
              )}

              {game.status === 'ended' && (
                <div className="text-xs text-gray-600 text-center py-2">
                  Settlement calculated • Click "Edit" to adjust
                </div>
              )}
            </div>
          </div>
        )}

        {/* Players / Final Results */}
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-3">
            {game.status === 'ended' ? 'Final Results' : `Players ${players.length > 0 ? `(${players.length})` : ''}`}
          </h2>

          {players.length === 0 ? (
            <div className="border border-gray-200 rounded-md p-8 text-center">
              <p className="text-sm text-gray-600 mb-1">No players yet</p>
              <p className="text-xs text-gray-500">Share code {game.game_code} to invite players</p>
            </div>
          ) : game.status === 'ended' ? (
            // Show final settlement for ended games
            <div className="space-y-2">
              {players
                .map(p => ({
                  ...p,
                  profit: p.payout_amount - p.total_deposited
                }))
                .sort((a, b) => b.profit - a.profit)
                .map((player) => {
                  const fcUser = farcasterUsers.get(player.fid)
                  const isWinner = player.profit > 0
                  const isLoser = player.profit < 0

                  return (
                    <div
                      key={player.id}
                      className={`border rounded-md p-3 ${
                        isWinner ? 'border-green-200 bg-green-50' : isLoser ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <Image
                            src={fcUser?.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.fid}`}
                            alt={fcUser?.username || `User ${player.fid}`}
                            width={32}
                            height={32}
                            className="rounded-full"
                            unoptimized
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black truncate">
                              {fcUser ? `@${fcUser.username}` : `User ${player.fid}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Final chips: {player.final_chip_count.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-black">
                            {formatCurrency(player.payout_amount, game.currency)}
                          </p>
                          <p className={`text-xs ${isWinner ? 'text-green-700' : isLoser ? 'text-red-700' : 'text-gray-600'}`}>
                            {player.profit >= 0 ? '+' : ''}{formatCurrency(player.profit, game.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                        Deposited: {formatCurrency(player.total_deposited, game.currency)}
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            // Show active players list
            <div className="space-y-2">
              {players.map((player) => {
                const fcUser = farcasterUsers.get(player.fid)
                return (
                  <div
                    key={player.id}
                    className="border border-gray-200 rounded-md p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Image
                          src={fcUser?.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.fid}`}
                          alt={fcUser?.username || `User ${player.fid}`}
                          width={32}
                          height={32}
                          className="rounded-full"
                          unoptimized
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black truncate">
                            {fcUser ? `@${fcUser.username}` : `User ${player.fid}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {player.total_buy_ins} buy-ins • {formatCurrency(player.total_deposited, game.currency)}
                          </p>
                        </div>
                      </div>
                      {game.status === 'active' && (
                        <button
                          onClick={() => handleAddBuyIn(player.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          + Buy-in
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
