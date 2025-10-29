'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { formatCurrency, getFarcasterUsers, type FarcasterUser } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import ShareLink from '@/components/ShareLink'
import WalletModal from '@/components/WalletModal'
import { useAccount } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { useDepositUSDC, useApproveUSDC, useUSDCAllowance, useDistributePayout, useCreateGame, useUSDCBalance } from '@/hooks/usePokerEscrow'
import { parseUSDC, USDC_ADDRESS } from '@/lib/contracts'
import { wagmiConfig } from '@/lib/wagmi'

export default function PlayerView() {
  const { gameCode } = useParams()
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  // Wagmi wallet hooks
  const { address: walletAddress, isConnected, connector } = useAccount()
  const [showWalletModal, setShowWalletModal] = useState(false)

  // Blockchain hooks
  const { createGame: createGameOnChain, isPending: isCreatingGame } = useCreateGame()
  const { depositUSDC } = useDepositUSDC()
  const { approveUSDC } = useApproveUSDC()
  const { allowance, refetch: refetchAllowance } = useUSDCAllowance(walletAddress)
  const { balance: usdcBalance, refetch: refetchBalance } = useUSDCBalance(walletAddress)
  const { distributePayout } = useDistributePayout()

  const [game, setGame] = useState<Game | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [farcasterUsers, setFarcasterUsers] = useState<Map<number, FarcasterUser>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [buyInStatus, setBuyInStatus] = useState<'idle' | 'approving' | 'depositing' | 'confirming'>('idle')
  const [error, setError] = useState('')
  const fetchedFidsRef = useRef<Set<number>>(new Set())

  // Host-specific state
  const [chipCounts, setChipCounts] = useState<Record<string, string>>({})
  const [isCalculatingSettlement, setIsCalculatingSettlement] = useState(false)
  const [pauseSubscription, setPauseSubscription] = useState(false)

  useEffect(() => {
    if (!gameCode || !isSDKLoaded || !context) return

    const loadGameData = async () => {
      // Skip if we're in the middle of a transaction
      if (pauseSubscription) {
        console.log('Skipping data reload during transaction')
        return
      }

      try {
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_code', gameCode)
          .single()

        if (gameError) {
          console.warn('Error loading game data:', gameError)
          // Don't set error state if we're just having subscription issues
          if (!game) {
            setError('Game not found')
            setIsLoading(false)
          }
          return
        }

        if (!gameData) {
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
          // Only update if we don't have counts yet OR if game just ended (to load final counts)
          if (gameData.status !== 'waiting') {
            setChipCounts(prevCounts => {
              const counts: Record<string, string> = {}
              playersData.forEach(p => {
                // Keep existing value if user is typing, otherwise use database value
                if (prevCounts[p.id] !== undefined) {
                  counts[p.id] = prevCounts[p.id]
                } else {
                  // Use saved final_chip_count if exists, otherwise use total_deposited
                  counts[p.id] = p.final_chip_count > 0
                    ? p.final_chip_count.toString()
                    : p.total_deposited.toString()
                }
              })
              return counts
            })
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

  // Shared buy-in logic for both joining and additional buy-ins
  const handleBuyIn = async () => {
    if (!game || !context) return

    setIsJoining(true)
    setBuyInStatus('idle')
    setError('')
    setPauseSubscription(true) // Pause subscriptions during transaction

    try {
      // Step 0: Ensure wallet is connected
      if (!isConnected || !walletAddress) {
        console.log('No wallet connected, showing wallet modal...')
        setShowWalletModal(true)
        setIsJoining(false)
        setPauseSubscription(false)
        return
      }

      console.log('Wallet connected:', walletAddress)

      // Step 1: Check USDC balance
      try {
        await refetchBalance()
      } catch (balanceError) {
        console.warn('Failed to check balance, continuing anyway:', balanceError)
        // Don't block the transaction if balance check fails - let the contract handle it
      }
      
      const requiredAmount = parseUSDC(game.buy_in_amount)
      
      // Debug logging
      console.log('=== BALANCE CHECK DEBUG ===')
      console.log('Wallet Address:', walletAddress)
      console.log('Raw USDC Balance:', usdcBalance?.toString())
      console.log('Required Amount (raw):', requiredAmount.toString())
      console.log('Required Amount (USDC):', game.buy_in_amount)
      console.log('Current Balance (USDC):', usdcBalance ? Number(usdcBalance) / 1e6 : 'undefined')
      console.log('Balance Check:', usdcBalance !== undefined && usdcBalance < requiredAmount ? 'INSUFFICIENT' : 'OK')
      console.log('========================')
      
      // Only check balance if we successfully fetched it
      if (usdcBalance !== undefined && usdcBalance < requiredAmount) {
        const currentBalance = Number(usdcBalance) / 1e6
        setError(`Insufficient USDC balance. You need ${game.buy_in_amount} USDC but have ${currentBalance.toFixed(2)} USDC. You need to get testnet USDC first.`)
        throw new Error(`Insufficient USDC balance: need ${game.buy_in_amount}, have ${currentBalance.toFixed(2)}`)
      }

      // Step 2: Check USDC allowance
      console.log('Checking USDC allowance...')
      try {
        await refetchAllowance()
        console.log('Current allowance:', allowance?.toString() || 'undefined')
      } catch (allowanceError) {
        console.warn('Failed to check allowance, will try to approve anyway:', allowanceError)
      }

      // Step 3: Approve USDC if needed
      const needsApproval = !allowance || allowance < requiredAmount
      console.log('Needs approval?', needsApproval, '(allowance:', allowance?.toString(), 'required:', requiredAmount.toString(), ')')

      if (needsApproval) {
        console.log('Requesting USDC approval...')
        console.log('Current connector:', connector?.name)
        console.log('USDC Address:', USDC_ADDRESS)
        console.log('Escrow Address:', require('@/lib/contracts').POKER_ESCROW_ADDRESS)
        setBuyInStatus('approving')

        // Approve 10x the buy-in amount to avoid needing multiple approvals
        const approvalAmount = game.buy_in_amount * 10
        console.log('Approval amount:', approvalAmount, 'USDC =', parseUSDC(approvalAmount).toString(), 'raw')

        const approveHash = await approveUSDC(approvalAmount)
        console.log('Approval transaction submitted:', approveHash)

        // Wait for approval to be mined
        console.log('Waiting for approval confirmation...')
        setBuyInStatus('confirming')
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash })
        console.log('USDC approval confirmed!')
        
        // Refetch allowance to ensure it's updated
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second for state to sync
        await refetchAllowance()
        console.log('Allowance refetched after approval')
      }

      // Step 4: Deposit USDC to escrow contract
      console.log('Requesting USDC deposit...')
      setBuyInStatus('depositing')

      const depositHash = await depositUSDC(game.id, game.buy_in_amount)
      console.log('Deposit transaction submitted:', depositHash)

      // Wait for deposit to be mined
      console.log('Waiting for deposit confirmation...')
      setBuyInStatus('confirming')
      await waitForTransactionReceipt(wagmiConfig, { hash: depositHash })
      console.log('USDC deposit confirmed!')

      // Step 5: Update database ONLY after blockchain confirmation
      console.log('Updating database...')
      if (player) {
        // Existing player - additional buy-in
        const { error } = await supabase
          .from('players')
          .update({
            total_buy_ins: player.total_buy_ins + 1,
            total_deposited: player.total_deposited + game.buy_in_amount,
          })
          .eq('id', player.id)

        if (!error) {
          setPlayer({
            ...player,
            total_buy_ins: player.total_buy_ins + 1,
            total_deposited: player.total_deposited + game.buy_in_amount,
          })
          console.log('Buy-in recorded successfully!')
        } else {
          console.error('Error updating buy-in:', error)
          setError('Blockchain transaction succeeded but failed to record in database. Contact support.')
        }
      } else {
        // New player - joining game
        if (!walletAddress) {
          throw new Error('Wallet address not found')
        }

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
          setError('Blockchain transaction succeeded but failed to record join. Contact support.')
          return
        }

        console.log('Successfully joined game:', newPlayer)
        setPlayer(newPlayer)
      }
    } catch (err) {
      console.error('Error with buy-in:', err)

      // Better error messages based on what failed
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
          setError('Transaction cancelled - you did not approve in your wallet')
        } else if (err.message.includes('Insufficient USDC balance')) {
          // Error already set, don't override
        } else if (err.message.includes('Failed to connect wallet')) {
          setError('Failed to connect wallet. Please try again.')
        } else if (err.message.includes('insufficient funds')) {
          setError('Insufficient USDC balance for buy-in')
        } else {
          setError(`Transaction failed: ${err.message}`)
        }
      } else {
        setError('Transaction failed. Please try again.')
      }
    } finally {
      setIsJoining(false)
      setBuyInStatus('idle')
      setPauseSubscription(false) // Resume subscriptions
    }
  }

  const handleJoinGame = handleBuyIn

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
    if (!game || !walletAddress) return

    setIsCalculatingSettlement(true)
    setError('')

    try {
      const payouts = calculatePayouts()

      // Validate payouts
      if (payouts.length === 0) {
        setError('No players to distribute to')
        return
      }

      // Step 1: Distribute payouts on blockchain
      const playerAddresses = payouts.map(p => p.player.wallet_address)
      const usdcAmounts = payouts.map(p => p.payout)
      const ethAmounts = payouts.map(() => 0) // Not using ETH

      console.log('Distributing payouts on blockchain...')
      console.log('Player addresses:', playerAddresses)
      console.log('USDC amounts:', usdcAmounts)

      // Call distributePayout and wait for transaction hash
      console.log('Waiting for user to confirm transaction...')
      const txHash = await distributePayout(game.id, playerAddresses, usdcAmounts, ethAmounts)

      console.log('Transaction submitted! Hash:', txHash)
      console.log('Waiting for blockchain confirmation...')

      // Wait for transaction to be mined
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash,
      })

      console.log('Transaction confirmed!', receipt)

      // Step 2: Update database
      console.log('Updating database with final settlement...')
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
        console.log('Settlement complete!')
      } else {
        console.error('Database update error:', error)
        setError('Failed to update game status')
      }
    } catch (err) {
      console.error('Error settling game:', err)
      setError(err instanceof Error ? err.message : 'Failed to settle game')
    } finally {
      setIsCalculatingSettlement(false)
    }
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
            {isConnected && usdcBalance !== undefined && (
              <p className="text-xs text-gray-500 mt-2">
                Your balance: {(Number(usdcBalance) / 1e6).toFixed(2)} USDC
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2 font-mono">
              USDC: {USDC_ADDRESS}
            </p>
          </div>

          {/* Wallet recommendation */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-xs text-blue-800">
              💡 <strong>Recommended:</strong> Use MetaMask or Coinbase Wallet for the best testnet experience.
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
            {buyInStatus === 'approving'
              ? 'Confirm approval in wallet...'
              : buyInStatus === 'depositing'
              ? 'Confirm deposit in wallet...'
              : buyInStatus === 'confirming'
              ? 'Waiting for blockchain confirmation...'
              : isJoining
              ? 'Processing...'
              : game.status === 'ended'
              ? 'Game Ended'
              : `Join Game for ${formatCurrency(game.buy_in_amount, game.currency)}`
            }
          </button>
        </div>

        {/* Wallet Modal */}
        <WalletModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnectSuccess={() => {
            setShowWalletModal(false)
            // After successful connection, trigger buy-in automatically
            setTimeout(() => handleBuyIn(), 500)
          }}
        />
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
            <>
              {usdcBalance !== undefined && (
                <p className="text-xs text-gray-500 mb-2">
                  Your USDC balance: {(Number(usdcBalance) / 1e6).toFixed(2)} USDC
                </p>
              )}
              {connector?.name.toLowerCase().includes('farcaster') && (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    Having issues? Try using{' '}
                    <button
                      onClick={() => setShowWalletModal(true)}
                      className="underline font-medium"
                    >
                      a different wallet
                    </button>
                  </p>
                </div>
              )}
              <button
                onClick={handleBuyIn}
                disabled={isJoining}
                className="w-full px-4 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {buyInStatus === 'approving'
                  ? 'Confirm approval in wallet...'
                  : buyInStatus === 'depositing'
                  ? 'Confirm deposit in wallet...'
                  : buyInStatus === 'confirming'
                  ? 'Waiting for blockchain confirmation...'
                  : isJoining
                  ? 'Processing...'
                  : `${player.total_buy_ins === 0 ? 'Buy In' : 'Buy In Again'} (${formatCurrency(game.buy_in_amount, game.currency)})`
                }
              </button>
            </>
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
                            className="rounded-full shrink-0"
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
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Payout Amounts</h4>
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
                              <div className="flex flex-col flex-1">
                                <span className="font-medium text-black truncate">
                                  {fcUser ? `@${fcUser.username}` : `User ${p.fid}`}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {chips} chips • Deposited {formatCurrency(p.total_deposited, game.currency)}
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-black">
                                  {formatCurrency(payout, game.currency)}
                                </span>
                                <span className={`text-xs ${isWinner ? 'text-green-700' : isLoser ? 'text-red-700' : 'text-gray-600'}`}>
                                  {profit >= 0 ? '+' : ''}{formatCurrency(profit, game.currency)}
                                </span>
                              </div>
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

        {/* Wallet Modal */}
        <WalletModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnectSuccess={() => {
            setShowWalletModal(false)
            // After successful connection, trigger buy-in automatically
            setTimeout(() => handleBuyIn(), 500)
          }}
        />
      </div>
    </div>
  )
}
