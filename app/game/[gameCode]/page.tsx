'use client'

import { useFarcaster } from '@/lib/farcaster-provider'
import { supabase } from '@/lib/supabase'
import { Game, Player } from '@/lib/types'
import { formatCurrency, getFarcasterUsers, type FarcasterUser } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import ShareLink from '@/components/ShareLink'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { useDepositUSDC, useApproveUSDC, useUSDCAllowance, useDistributePayout, useCreateGame, useUSDCBalance } from '@/hooks/usePokerEscrow'
import { parseUSDC, USDC_ADDRESS } from '@/lib/contracts'
import { wagmiConfig, activeChain } from '@/lib/wagmi'

export default function PlayerView() {
  const { gameCode } = useParams()
  const { isSDKLoaded, context } = useFarcaster()
  const router = useRouter()

  // Wagmi wallet hooks
  const { address: walletAddress, isConnected, connector, chain } = useAccount()
  const { switchChain } = useSwitchChain()

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
    if (!gameCode) return

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

        // Only load player data if we have context
        if (context) {
          const { data: playerData } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', gameData.id)
            .eq('fid', context.user.fid)
            .single()

          if (playerData) {
            setPlayer(playerData)
          }
        }

        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameData.id)
          .eq('status', 'deposited')  // Only show deposited players
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
  }, [gameCode, context, game])

  // Retry helper function for database updates
  const retryDatabaseUpdate = async (playerId: string, maxRetries = 3): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      const { error } = await supabase
        .from('players')
        .update({ status: 'deposited' })
        .eq('id', playerId)

      if (!error) {
        console.log('✅ Player marked as deposited')
        return true
      }

      console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
    }

    console.error('❌ Failed to update DB after all retries')
    return false
  }

  // Shared buy-in logic for both joining and additional buy-ins
  const handleBuyIn = async () => {
    if (!game || !context) return

    setIsJoining(true)
    setBuyInStatus('idle')
    setError('')
    setPauseSubscription(true) // Pause subscriptions during transaction

    let pendingPlayerId: string | null = null  // Track pending record for cleanup on error

    try {
      // Step 0: Ensure wallet is connected
      if (!isConnected || !walletAddress) {
        console.log('No wallet connected, user needs to connect first')
        setError('Please connect your wallet first')
        setIsJoining(false)
        setPauseSubscription(false)
        return
      }

      console.log('Wallet connected:', walletAddress)

      // Step 0.5: Check if player already has pending transaction
      if (player && player.status === 'pending') {
        setError('Transaction already in progress. Please wait for it to complete.')
        setIsJoining(false)
        setPauseSubscription(false)
        return
      }

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
        setError(`Insufficient USDC balance. You need ${game.buy_in_amount} USDC but have ${currentBalance.toFixed(2)} USDC.`)
        throw new Error(`Insufficient USDC balance: need ${game.buy_in_amount}, have ${currentBalance.toFixed(2)}`)
      }

      // Step 2: CREATE PENDING PLAYER RECORD FIRST (before blockchain transactions)
      if (!player) {
        // New player - CREATE PENDING RECORD FIRST
        if (!walletAddress) {
          throw new Error('Wallet address not found')
        }

        console.log('📝 Creating pending player record BEFORE blockchain...')
        const { data: pendingPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            game_id: game.id,
            fid: context.user.fid,
            wallet_address: walletAddress,
            total_buy_ins: 1,
            total_deposited: game.buy_in_amount,
            status: 'pending',  // ← Create as pending FIRST
          })
          .select()
          .single()

        if (createError) {
          console.error('Failed to create pending player:', createError)

          // Check for duplicate pending record (unique constraint)
          if (createError.code === '23505') {
            setError('You already have a pending transaction for this game. Please wait for it to complete.')
          } else {
            setError('Failed to start join process. Please try again.')
          }

          setIsJoining(false)
          setPauseSubscription(false)
          return
        }

        console.log('✅ Pending player created:', pendingPlayer.id)
        pendingPlayerId = pendingPlayer.id

        // Show pending player in UI immediately
        setPlayer(pendingPlayer)
      }

      // Step 3: Check USDC allowance
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

        // Approve the exact buy-in amount needed
        const approvalAmount = game.buy_in_amount
        console.log('Approval amount:', approvalAmount, 'USDC =', parseUSDC(approvalAmount).toString(), 'raw')

        const approveHash = await approveUSDC(approvalAmount)
        console.log('Approval transaction submitted:', approveHash)
        console.log('Approval hash type:', typeof approveHash, 'length:', approveHash?.length)

        // Validate hash before waiting
        if (!approveHash || typeof approveHash !== 'string' || !approveHash.startsWith('0x') || approveHash.length !== 66) {
          throw new Error(`Invalid approval transaction hash: ${approveHash}`)
        }

        // Wait for approval to be mined
        console.log('Waiting for approval confirmation...')
        setBuyInStatus('confirming')
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash as `0x${string}` })
        console.log('USDC approval confirmed!')
        
        // Refetch allowance to ensure it's updated
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second for state to sync
        await refetchAllowance()
        console.log('Allowance refetched after approval')
      }

      // Step 5: Deposit USDC to escrow contract
      console.log('Requesting USDC deposit...')
      setBuyInStatus('depositing')

      const depositHash = await depositUSDC(game.id, game.buy_in_amount)
      console.log('Deposit transaction submitted:', depositHash)
      console.log('Deposit hash type:', typeof depositHash, 'length:', depositHash?.length)

      // Validate hash before waiting
      if (!depositHash || typeof depositHash !== 'string' || !depositHash.startsWith('0x') || depositHash.length !== 66) {
        throw new Error(`Invalid deposit transaction hash: ${depositHash}`)
      }

      // Wait for deposit to be mined
      console.log('Waiting for deposit confirmation...')
      setBuyInStatus('confirming')
      await waitForTransactionReceipt(wagmiConfig, { hash: depositHash as `0x${string}` })
      console.log('✅ USDC deposit confirmed on blockchain!')

      // Step 6: Mark player as deposited (with retry logic)
      if (pendingPlayerId) {
        console.log('📝 Marking player as deposited...')
        const updateSuccess = await retryDatabaseUpdate(pendingPlayerId)

        if (!updateSuccess) {
          // All retries failed, but money is in contract
          console.error('⚠️ Failed to mark as deposited after retries, but blockchain succeeded')
          // Player will show as pending in UI with a message
          // Admin can manually update later if needed
        }

        // Refetch player data to get updated status
        const { data: updatedPlayer } = await supabase
          .from('players')
          .select('*')
          .eq('id', pendingPlayerId)
          .single()

        if (updatedPlayer) {
          setPlayer(updatedPlayer)
        }
      } else if (player) {
        // Re-buy for existing player - update totals
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
          console.log('✅ Re-buy recorded successfully!')
        } else {
          console.error('Error updating re-buy:', error)
          // Don't throw - money is in contract, just couldn't update totals
        }
      }

      // Manually refetch all players to ensure list is updated
      const { data: updatedPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .eq('status', 'deposited')  // Only show deposited players
        .order('created_at', { ascending: true })

      if (updatedPlayers) {
        setAllPlayers(updatedPlayers)
      }

      console.log('🎉 Join process completed successfully!')
    } catch (err) {
      console.error('Error with buy-in:', err)

      // Clean up pending player record if blockchain failed
      if (pendingPlayerId) {
        console.log('🧹 Cleaning up pending player record due to error...')
        await supabase
          .from('players')
          .delete()
          .eq('id', pendingPlayerId)

        setPlayer(null)  // Remove from UI
      }

      // Detailed error messages based on what failed
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase()
        
        // User cancelled transaction
        if (errorMessage.includes('user rejected') || errorMessage.includes('user denied') || errorMessage.includes('rejected')) {
          setError('❌ Transaction cancelled. Click "Try Again" below when you\'re ready to approve in your wallet.')
        } 
        // Insufficient balance errors
        else if (errorMessage.includes('insufficient usdc balance')) {
          setError('💰 Insufficient USDC balance. You need to add more USDC to your wallet first.')
        } 
        else if (errorMessage.includes('insufficient funds')) {
          setError('💰 Insufficient funds. Make sure you have enough USDC and ETH for gas fees.')
        }
        // Network/connection errors
        else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
          setError('🌐 Network error. Please check your connection and try again.')
        }
        // Wallet connection errors
        else if (errorMessage.includes('failed to connect wallet') || errorMessage.includes('connector')) {
          setError('🔌 Failed to connect wallet. Please reconnect your wallet and try again.')
        }
        // Contract/blockchain errors
        else if (errorMessage.includes('execution reverted') || errorMessage.includes('revert')) {
          setError('⛓️ Transaction failed on blockchain. This might be a contract error. Please try again.')
        }
        // Generic transaction failure
        else if (errorMessage.includes('transaction failed')) {
          setError('❌ Transaction failed. Please try again. If the problem persists, check your wallet connection.')
        }
        // Unknown error with details
        else {
          setError(`❌ Transaction failed: ${err.message}. Please try again or contact support.`)
        }
      } else {
        setError('❌ An unexpected error occurred. Please try again.')
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
      console.log('Transaction hash type:', typeof txHash, 'length:', txHash?.length)

      // Validate hash before waiting
      if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x') || txHash.length !== 66) {
        throw new Error(`Invalid settlement transaction hash: ${txHash}`)
      }

      console.log('Waiting for blockchain confirmation...')

      // Wait for transaction to be mined
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash as `0x${string}`,
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
      
      // Detailed error messages for settlement
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase()
        
        if (errorMessage.includes('user rejected') || errorMessage.includes('user denied') || errorMessage.includes('rejected')) {
          setError('❌ Settlement cancelled. Click "Try Again" to approve the payout distribution in your wallet.')
        } else if (errorMessage.includes('insufficient balance')) {
          setError('⚠️ Insufficient balance in escrow contract. This shouldn\'t happen - please contact support.')
        } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          setError('🌐 Network error while processing settlement. Please check your connection and try again.')
        } else if (errorMessage.includes('only host') || errorMessage.includes('onlyhost')) {
          setError('🔒 Only the game host can distribute payouts.')
        } else {
          setError(`❌ Settlement failed: ${err.message}. Please try again.`)
        }
      } else {
        setError('❌ Settlement failed. Please try again.')
      }
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
        {/* Purple Header */}
        <div className="bg-primary text-white px-4 py-4 shadow-[0_2px_0_0_rgba(0,0,0,1)]">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-white/80 font-[family-name:var(--font-margarine)] text-base"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-[family-name:var(--font-lilita)] tracking-tight" style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}>
              {game.game_code}
            </h1>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="border-4 border-black rounded-2xl p-6 mb-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-xl font-[family-name:var(--font-lilita)] text-black mb-4">Join the Game</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border-2 border-black rounded-xl p-3 bg-white">
                <p className="text-xs text-gray-500 mb-1 font-[family-name:var(--font-margarine)]">Buy-in</p>
                <p className="text-lg font-[family-name:var(--font-lilita)] text-black">
                  ${game.buy_in_amount}
                </p>
              </div>
              <div className="border-2 border-black rounded-xl p-3 bg-white">
                <p className="text-xs text-gray-500 mb-1 font-[family-name:var(--font-margarine)]">Players</p>
                <p className="text-lg font-[family-name:var(--font-lilita)] text-black">{allPlayers.length}</p>
              </div>
            </div>

            {/* Supporting text for buy-in */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-blue-800 font-[family-name:var(--font-margarine)]">
                💰 By joining, ${game.buy_in_amount} will be deposited from your wallet to the game escrow.
              </p>
              {isConnected && usdcBalance !== undefined && (
                <p className="text-sm text-blue-700 mt-2 font-[family-name:var(--font-margarine)]">
                  Your balance: {(Number(usdcBalance) / 1e6).toFixed(2)} USDC
                </p>
              )}
            </div>

            {/* Network warning */}
            {isConnected && chain && chain.id !== activeChain.id && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-800 mb-2 font-[family-name:var(--font-margarine)]">
                  ⚠️ <strong>Wrong Network!</strong> You're on {chain.name} but need to be on {activeChain.name}.
                </p>
                <button
                  onClick={() => switchChain?.({ chainId: activeChain.id })}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-[family-name:var(--font-lilita)] text-sm"
                >
                  Switch to {activeChain.name}
                </button>
              </div>
            )}

            {/* Wallet recommendation */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-blue-800 font-[family-name:var(--font-margarine)]">
                💡 <strong>Recommended:</strong> Use MetaMask or Coinbase Wallet for the best experience.
              </p>
            </div>

            {/* Show notice if SDK isn't loaded */}
            {!isSDKLoaded && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-yellow-800 font-[family-name:var(--font-margarine)]">
                  ⏳ Loading Farcaster connection... Please wait a moment.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-[family-name:var(--font-lilita)] mb-1">Error</p>
                    <p className="text-sm text-red-700 font-[family-name:var(--font-margarine)]">{error}</p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="text-red-400 hover:text-red-600 text-lg leading-none"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
                <button
                  onClick={() => {
                    setError('')
                    handleJoinGame()
                  }}
                  disabled={isJoining}
                  className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-[family-name:var(--font-lilita)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  Try Again
                </button>
              </div>
            )}

            <button
              onClick={handleJoinGame}
              disabled={isJoining || game.status === 'ended'}
              className="w-full py-4 bg-black text-white text-lg font-[family-name:var(--font-lilita)] rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              style={{ textShadow: '0 2px 0 rgba(0,0,0,0.5)' }}
            >
              {buyInStatus === 'approving'
                ? 'Approve USDC Spending...'
                : buyInStatus === 'depositing'
                ? `Confirm $${game.buy_in_amount} Deposit...`
                : buyInStatus === 'confirming'
                ? 'Waiting for Confirmation...'
                : isJoining
                ? 'Processing...'
                : game.status === 'ended'
                ? 'Game Ended'
                : isConnected && allowance && allowance >= parseUSDC(game.buy_in_amount)
                ? `Join Game for $${game.buy_in_amount}`
                : isConnected
                ? `Approve & Join for $${game.buy_in_amount}`
                : `Join Game for $${game.buy_in_amount}`
              }
            </button>

            {/* Show Connect Button if not connected */}
            {!isConnected && (
              <div className="mt-4">
                <ConnectButton />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Player is in the game
  return (
    <div className="min-h-screen bg-white">
      {/* Purple Header */}
      <div className="bg-primary text-white px-4 py-4 shadow-[0_2px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-white/80 font-[family-name:var(--font-margarine)] text-base"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-[family-name:var(--font-lilita)] tracking-tight" style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}>
            {game.game_code}
          </h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
        {isHost && (
          <div className="max-w-2xl mx-auto mt-2">
            <p className="text-center text-sm font-[family-name:var(--font-margarine)] text-white/90">
              👑 You're the host
            </p>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Game Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border-2 border-black rounded-xl p-3 bg-white">
            <p className="text-xs text-gray-500 mb-1 font-[family-name:var(--font-margarine)]">Buy-in</p>
            <p className="text-lg font-[family-name:var(--font-lilita)] text-black">
              ${game.buy_in_amount}
            </p>
          </div>
          <div className="border-2 border-black rounded-xl p-3 bg-white">
            <p className="text-xs text-gray-600 mb-1 font-[family-name:var(--font-margarine)]">Total Pot</p>
            <p className="text-lg font-[family-name:var(--font-lilita)] text-black">
              ${totalPot}
            </p>
          </div>
        </div>

        {/* Share Link */}
        <div className="mb-6">
          <ShareLink gameCode={game.game_code} />
        </div>

        {/* Your Stats */}
        <div className="mb-6 border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <h2 className="text-lg font-[family-name:var(--font-lilita)] text-black mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border-2 border-black rounded-xl p-3 bg-white">
              <p className="text-xs text-gray-500 mb-1 font-[family-name:var(--font-margarine)]">Buy-ins</p>
              <p className="text-lg font-[family-name:var(--font-lilita)] text-black">{player.total_buy_ins}</p>
            </div>
            <div className="border-2 border-black rounded-xl p-3 bg-white">
              <p className="text-xs text-gray-500 mb-1 font-[family-name:var(--font-margarine)]">Deposited</p>
              <p className="text-lg font-[family-name:var(--font-lilita)] text-black">
                ${player.total_deposited}
              </p>
            </div>
          </div>

          {/* Buy In Button - Available for additional buy-ins during game */}
          {game.status !== 'ended' && (
            <>
              {usdcBalance !== undefined && (
                <p className="text-sm text-gray-500 mb-2 font-[family-name:var(--font-margarine)]">
                  💰 Balance: {(Number(usdcBalance) / 1e6).toFixed(2)} USDC
                </p>
              )}
              <button
                onClick={handleBuyIn}
                disabled={isJoining}
                className="w-full py-3 bg-primary text-white text-base font-[family-name:var(--font-lilita)] rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                style={{ textShadow: '0 2px 0 rgba(0,0,0,1)' }}
              >
                {buyInStatus === 'approving'
                  ? 'Approve USDC Spending...'
                  : buyInStatus === 'depositing'
                  ? `Confirm $${game.buy_in_amount} Deposit...`
                  : buyInStatus === 'confirming'
                  ? 'Waiting for Confirmation...'
                  : isJoining
                  ? 'Processing...'
                  : allowance && allowance >= parseUSDC(game.buy_in_amount)
                  ? `Buy In Again for $${game.buy_in_amount}`
                  : `Approve & Buy In for $${game.buy_in_amount}`
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
                  className="w-full py-4 bg-black text-white text-lg font-[family-name:var(--font-lilita)] rounded-xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  style={{ textShadow: '0 2px 0 rgba(0,0,0,0.5)' }}
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

                  {/* Error Display for Settlement */}
                  {error && isHost && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-red-800 font-medium mb-1">Error</p>
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                        <button
                          onClick={() => setError('')}
                          className="text-red-400 hover:text-red-600 text-lg leading-none"
                          aria-label="Dismiss error"
                        >
                          ×
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setError('')
                          handleCalculateSettlement()
                        }}
                        disabled={isCalculatingSettlement}
                        className="mt-3 w-full px-3 py-2 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Try Again
                      </button>
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
          <h2 className="text-gray-400 font-[family-name:var(--font-margarine)] text-sm mb-3 uppercase tracking-wide">
            Players ({allPlayers.length})
          </h2>
          <div className="space-y-3">
            {allPlayers.map((p) => {
              const fcUser = farcasterUsers.get(p.fid)
              return (
                <div
                  key={p.id}
                  className={`border-2 rounded-xl p-4 ${
                    p.id === player.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-primary">
                      <Image
                        src={fcUser?.pfpUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.fid}`}
                        alt={fcUser?.username || `User ${p.fid}`}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-[family-name:var(--font-margarine)] text-black">
                        {fcUser ? `@${fcUser.username}` : `User ${p.fid}`}
                        {p.id === player.id && ' (You)'}
                      </p>
                      <p className="text-sm text-gray-500 font-[family-name:var(--font-margarine)]">
                        {p.total_buy_ins} buy-ins • ${p.total_deposited}
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
