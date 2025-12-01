'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game } from '@/lib/types'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUSDCBalance } from '@/hooks/usePokerEscrow'
import { useAccount } from 'wagmi'
import Image from 'next/image'

export default function Home() {
  const { isSDKLoaded, context, isLoading } = useFarcaster()
  const router = useRouter()
  const { address: walletAddress } = useAccount()
  const { balance: usdcBalance } = useUSDCBalance(walletAddress)

  const [gameCode, setGameCode] = useState('')
  const [location, setLocation] = useState('')
  const [buyInAmount, setBuyInAmount] = useState('')
  const [myGames, setMyGames] = useState<Array<Game & { isHost: boolean; playerCount: number }>>([])

  // Load user's games
  useEffect(() => {
    if (!context) return

    const loadMyGames = async () => {
      // Get games where I'm the host
      const { data: hostedGames } = await supabase
        .from('games')
        .select('*')
        .eq('host_fid', context.user.fid)
        .order('created_at', { ascending: false })
        .limit(10)

      // Get games where I'm a player
      const { data: players } = await supabase
        .from('players')
        .select('game_id, games(*)')
        .eq('fid', context.user.fid)

      // Get player counts for all games
      const allGames: Array<Game & { isHost: boolean; playerCount: number }> = []

      if (hostedGames) {
        for (const game of hostedGames) {
          const { count } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', game.id)

          allGames.push({ ...game, isHost: true, playerCount: count || 0 })
        }
      }

      if (players) {
        const joinedGames = players
          .map(p => p.games as unknown as Game)
          .filter(game => game && game.host_fid !== context.user.fid)

        for (const game of joinedGames) {
          const { count } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', game.id)

          allGames.push({ ...game, isHost: false, playerCount: count || 0 })
        }
      }

      // Sort by created date and remove duplicates
      const uniqueGames = allGames
        .filter((game, index, self) =>
          index === self.findIndex((g) => g.id === game.id)
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      setMyGames(uniqueGames)
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
    // Pass buy-in amount to create page via URL params
    const params = new URLSearchParams()
    if (buyInAmount) {
      params.set('buyIn', buyInAmount)
    }
    if (location) {
      params.set('location', location)
    }
    router.push(`/create?${params.toString()}`)
  }

  const handleJoinGame = () => {
    if (gameCode.trim().length === 6) {
      router.push(`/game/${gameCode.toUpperCase()}`)
    }
  }

  const handleOpenGame = (game: Game) => {
    router.push(`/game/${game.game_code}`)
  }

  const handlePresetAmount = (amount: number | 'max') => {
    if (amount === 'max' && usdcBalance) {
      setBuyInAmount((Number(usdcBalance) / 1e6).toFixed(2))
    } else if (typeof amount === 'number') {
      setBuyInAmount(amount.toString())
    }
  }

  const balance = usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : '0.00'

  return (
    <div className="min-h-screen bg-white">
      {/* Purple Header */}
      <div className="bg-primary text-white px-4 py-4 shadow-[0_2px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-[family-name:var(--font-lilita)] tracking-tight" style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}>
            Mr. Poker
          </h1>
          <div className="flex items-center gap-1 text-white font-[family-name:var(--font-margarine)] text-base">
            <span className="text-lg">💰</span>
            <span>${balance}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Main Card */}
        <div className="border-4 border-black rounded-2xl p-6 mb-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          {/* User Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary border-2 border-black overflow-hidden">
                {context.user.pfpUrl && (
                  <Image
                    src={context.user.pfpUrl}
                    alt={context.user.username || 'User'}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="font-[family-name:var(--font-margarine)] text-base text-black">
                  {context.user.displayName || context.user.username || `User ${context.user.fid}`}
                </p>
                <p className="text-sm text-black/40 font-[family-name:var(--font-margarine)]">
                  @{context.user.username || context.user.fid}
                </p>
              </div>
            </div>
            <div className="px-3 py-1.5 border-2 border-black rounded-lg bg-white">
              <span className="text-xs font-[family-name:var(--font-margarine)] text-black">🟣 Connected</span>
            </div>
          </div>

          {/* Create Game Section */}
          <div className="mb-6">
            <label className="block text-black font-[family-name:var(--font-margarine)] text-base mb-2">
              Where are you playing?
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="eg: Rob's house"
              className="w-full px-4 py-3 border-2 border-black rounded-xl text-base placeholder:text-gray-400 bg-white font-[family-name:var(--font-margarine)] text-black"
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-black font-[family-name:var(--font-margarine)] text-base">
                Buy-in Amount
              </label>
              <span className="text-sm text-gray-500 font-[family-name:var(--font-margarine)]">
                BAL: {balance} USDC
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-black rounded-xl bg-white mb-2">
              <span className="text-lg font-[family-name:var(--font-margarine)] text-black">$</span>
              <input
                type="number"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(e.target.value)}
                placeholder="10.00"
                step="0.01"
                min="0"
                className="flex-1 text-lg font-[family-name:var(--font-margarine)] outline-none bg-white text-black placeholder:text-gray-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePresetAmount(50)}
                className="flex-1 px-3 py-2 border-2 border-black rounded-lg text-sm font-[family-name:var(--font-margarine)] hover:bg-gray-100 bg-white text-black"
              >
                $50
              </button>
              <button
                onClick={() => handlePresetAmount(100)}
                className="flex-1 px-3 py-2 border-2 border-black rounded-lg text-sm font-[family-name:var(--font-margarine)] hover:bg-gray-100 bg-white text-black"
              >
                $100
              </button>
              <button
                onClick={() => handlePresetAmount('max')}
                className="flex-1 px-3 py-2 border-2 border-black rounded-lg text-sm font-[family-name:var(--font-margarine)] hover:bg-gray-100 bg-white text-black"
              >
                MAX
              </button>
            </div>
          </div>

          <button
            onClick={handleCreateGame}
            className="w-full py-4 bg-primary text-white text-lg font-[family-name:var(--font-lilita)] rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide"
            style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}
          >
            Create a Game
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
            <span className="text-gray-400 font-[family-name:var(--font-margarine)]">OR</span>
            <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
          </div>

          {/* Join Game Section */}
          <div className="mb-4">
            <label className="block text-black font-[family-name:var(--font-margarine)] text-base mb-2">
              Join a Game
            </label>
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-black rounded-xl bg-white">
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && gameCode.length === 6) {
                    handleJoinGame()
                  }
                }}
                placeholder="Enter game code"
                maxLength={6}
                className="flex-1 text-base font-[family-name:var(--font-margarine)] outline-none uppercase placeholder:text-gray-400 bg-white text-black"
              />
            </div>
          </div>

          <button
            onClick={handleJoinGame}
            disabled={gameCode.length !== 6}
            className="w-full py-4 bg-black text-white text-lg font-[family-name:var(--font-lilita)] rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            style={{ textShadow: '0 2px 0 rgba(0,0,0,0.5)' }}
          >
            Join a Game
          </button>
        </div>

        {/* My Games */}
        {myGames.length > 0 && (
          <div>
            <h2 className="text-gray-400 font-[family-name:var(--font-margarine)] text-sm mb-3 uppercase tracking-wide">
              My Games
            </h2>
            <div className="space-y-3">
              {myGames.map((game) => {
                const totalPot = game.buy_in_amount * game.playerCount
                const statusDisplay = game.status === 'waiting' ? 'LIVE' : game.status.toUpperCase()
                const statusColor = game.status === 'waiting' ? 'text-green-600' : 'text-gray-600'

                return (
                  <button
                    key={game.id}
                    onClick={() => handleOpenGame(game)}
                    className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Player Avatar Stack */}
                        <div className="flex -space-x-2">
                          {[...Array(Math.min(4, game.playerCount))].map((_, i) => (
                            <div
                              key={i}
                              className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center"
                            >
                              <span className="text-xs text-white">👤</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col">
                          <p className="font-[family-name:var(--font-lilita)] text-base text-black">
                            {game.location || game.game_code}
                          </p>
                          {game.location && (
                            <p className="text-xs text-gray-400 font-[family-name:var(--font-margarine)]">
                              Code: {game.game_code}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-xs text-gray-500 font-[family-name:var(--font-margarine)]">
                              Buy IN / Pot
                            </p>
                            <p className="font-[family-name:var(--font-margarine)] text-sm">
                              <span className="text-black">${game.buy_in_amount}</span>
                              <span className="text-gray-400"> / </span>
                              <span className="text-accent">${totalPot}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-[family-name:var(--font-margarine)]">
                              Status
                            </p>
                            <p className={`font-[family-name:var(--font-lilita)] text-sm ${statusColor}`}>
                              {statusDisplay}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
