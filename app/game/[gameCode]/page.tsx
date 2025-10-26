'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { formatCurrency, getFarcasterUsers, type FarcasterUser } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import ShareLink from '@/components/ShareLink'

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
  const fetchedFidsRef = useRef<Set<number>>(new Set())

  // Host-specific state
  const [chipCounts, setChipCounts] = useState<Record<string, string>>({})
  const [isCalculatingSettlement, setIsCalculatingSettlement] = useState(false)

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

          // Initialize chip counts for host (for settlement)
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
      .channel(`game-player-${gameCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `game_code=eq.${gameCode}`,
        },
        async (payload) => {
          console.log('Game update received:', payload)
          await loadGameData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        async (payload) => {
          console.log('Player update received:', payload)
          // Only reload if this change is for our game
          if (game && payload.new && (payload.new as any).game_id === game.id) {
            await loadGameData()
          } else if (!game) {
            // If we don't have game yet, reload to check
            await loadGameData()
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [gameCode, isSDKLoaded, context, game])

  const handleJoinGame = async () => {
    if (!game || !context) return

    setIsJoining(true)
    setError('')

    try {
      const walletAddress = `0x${context.user.fid.toString().padStart(40, '0')}`

      // Phase A: Simulate transaction by directly adding with 1 buy-in
      // Phase B: This will trigger actual blockchain transaction first
      console.log('Joining game with buy-in:', {
        game_id: game.id,
        fid: context.user.fid,
        wallet_address: walletAddress,
        total_buy_ins: 1,
        total_deposited: game.buy_in_amount,
      })

      const { data: newPlayer, error: joinError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          fid: context.user.fid,
          wallet_address: walletAddress,
          total_buy_ins: 1,
          total_deposited: game.buy_in_amount,
        })
        .select()
        .single()

      if (joinError) {
        console.error('Join error:', joinError)
        setError('Failed to join game')
        return
      }

      console.log('Successfully joined game:', newPlayer)
      setPlayer(newPlayer)
    } catch (err) {
      console.error('Error joining game:', err)
      setError('Something went wrong')
    } finally {
      setIsJoining(false)
    }
  }

  // Host-specific functions
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

  const calculatePayouts = () => {
    const totalPot = allPlayers.reduce((sum, p) => sum + p.total_deposited, 0)
    let totalChips = 0

    allPlayers.forEach(p => {
      const chips = parseFloat(chipCounts[p.id] || '0')
      totalChips += chips
    })

    if (totalChips === 0) return []

    return allPlayers.map(p => {
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

  const handleCalculateSettlement = async () => {
    if (!game) return
    setIsCalculatingSettlement(true)

    const payouts = calculatePayouts()

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

    const { error } = await supabase
      .from('games')
      .update({ status: 'active' })
      .eq('id', game.id)

    if (!error) {
      setGame({ ...game, status: 'active' })
    }
  }

  // Check if current user is the host
  const isHost = game && context && game.host_fid === context.user.fid

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

          {/* Supporting text for buy-in */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            <p className="text-xs text-gray-600">
              By joining, {formatCurrency(game.buy_in_amount, game.currency)} will be deposited from your wallet to the game escrow.
            </p>
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
            {isJoining ? 'Processing...' : game.status === 'ended' ? 'Game Ended' : `Join Game for ${formatCurrency(game.buy_in_amount, game.currency)}`}
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
          <p className="text-sm text-gray-600 capitalize">
            {game.status}{isHost && ' • You\'re the host'}
          </p>
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

        {/* Share Link */}
        <div className="mb-6">
          <ShareLink gameCode={game.game_code} />
        </div>

        {/* Your Stats */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
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

          {/* Buy In Button - Available for additional buy-ins during game */}
          {game.status !== 'ended' && (
            <button
              onClick={async () => {
                // Phase A: Just update the database
                // Phase B: This will trigger blockchain transaction
                const { error } = await supabase
                  .from('players')
                  .update({
                    total_buy_ins: player.total_buy_ins + 1,
                    total_deposited: player.total_deposited + game.buy_in_amount,
                  })
                  .eq('id', player.id)

                if (!error) {
                  // Update local state
                  setPlayer({
                    ...player,
                    total_buy_ins: player.total_buy_ins + 1,
                    total_deposited: player.total_deposited + game.buy_in_amount,
                  })
                }
              }}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 cursor-pointer transition-colors"
            >
              {player.total_buy_ins === 0 ? 'Buy In' : 'Buy In Again'} ({formatCurrency(game.buy_in_amount, game.currency)})
            </button>
          )}
        </div>

        {/* Host-only sections */}
        {isHost && (
          <>
            {/* Start Game Button - Only show when waiting */}
            {game.status === 'waiting' && (
              <div className="mb-6">
                <button
                  onClick={handleStartGame}
                  disabled={allPlayers.length === 0}
                  className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Start Game
                </button>
              </div>
            )}

            {/* Settlement Section - Show when game is active or ended */}
            {game.status !== 'waiting' && allPlayers.length > 0 && (
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
                    {allPlayers.map((p) => {
                      const fcUser = farcasterUsers.get(p.fid)
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <Image
                            src={fcUser?.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.fid}`}
                            alt={fcUser?.username || `User ${p.fid}`}
                            width={28}
                            height={28}
                            className="rounded-full flex-shrink-0"
                            unoptimized
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-black truncate">
                              {fcUser ? `@${fcUser.username}` : `User ${p.fid}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Deposited: {formatCurrency(p.total_deposited, game.currency)}
                            </p>
                          </div>
                          <div className="w-32">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={chipCounts[p.id] || ''}
                              onChange={(e) => {
                                // Only allow numbers and decimal point
                                const value = e.target.value
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setChipCounts({ ...chipCounts, [p.id]: value })
                                }
                              }}
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
                        {calculatePayouts().map(({ player: p, chips, payout, profit }) => {
                          const fcUser = farcasterUsers.get(p.fid)
                          const isWinner = profit > 0
                          const isLoser = profit < 0

                          return (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                                isWinner ? 'bg-green-50' : isLoser ? 'bg-red-50' : 'bg-gray-50'
                              }`}
                            >
                              <span className="font-medium text-black truncate flex-1">
                                {fcUser ? `@${fcUser.username}` : `User ${p.fid}`}
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
                      disabled={isCalculatingSettlement || allPlayers.some(p => !chipCounts[p.id] || parseFloat(chipCounts[p.id]) < 0)}
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
          </>
        )}

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
