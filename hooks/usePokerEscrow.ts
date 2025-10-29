import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { POKER_ESCROW_ABI, POKER_ESCROW_ADDRESS, USDC_ABI, USDC_ADDRESS, parseUSDC, uuidToBytes32 } from '@/lib/contracts'
import { useState } from 'react'

export function useCreateGame() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const createGame = async (gameId: string) => {
    const gameIdBytes = uuidToBytes32(gameId)
    writeContract({
      address: POKER_ESCROW_ADDRESS,
      abi: POKER_ESCROW_ABI,
      functionName: 'createGame',
      args: [gameIdBytes],
    })
  }

  return {
    createGame,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  }
}

export function useDepositUSDC() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const depositUSDC = async (gameId: string, amount: number) => {
    const gameIdBytes = uuidToBytes32(gameId)
    const amountBigInt = parseUSDC(amount)

    writeContract({
      address: POKER_ESCROW_ADDRESS,
      abi: POKER_ESCROW_ABI,
      functionName: 'depositUSDC',
      args: [gameIdBytes, amountBigInt],
    })
  }

  return {
    depositUSDC,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  }
}

export function useApproveUSDC() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const approveUSDC = async (amount: number) => {
    const amountBigInt = parseUSDC(amount)

    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [POKER_ESCROW_ADDRESS, amountBigInt],
    })
  }

  return {
    approveUSDC,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  }
}

export function useUSDCAllowance(userAddress: `0x${string}` | undefined) {
  const { data: allowance, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, POKER_ESCROW_ADDRESS] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  return {
    allowance: allowance as bigint | undefined,
    refetch,
  }
}

export function useUSDCBalance(userAddress: `0x${string}` | undefined) {
  const { data: balance, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  return {
    balance: balance as bigint | undefined,
    refetch,
  }
}

export function useDistributePayout() {
  const { writeContractAsync } = useWriteContract()

  const distributePayout = async (
    gameId: string,
    players: string[],
    usdcAmounts: number[],
    ethAmounts: number[]
  ) => {
    const gameIdBytes = uuidToBytes32(gameId)
    const usdcBigInts = usdcAmounts.map(amt => parseUSDC(amt))
    const ethBigInts = ethAmounts.map(amt => BigInt(0)) // We're not using ETH for now

    // Returns the transaction hash after user confirms
    const hash = await writeContractAsync({
      address: POKER_ESCROW_ADDRESS,
      abi: POKER_ESCROW_ABI,
      functionName: 'distributePayout',
      args: [gameIdBytes, players as `0x${string}`[], usdcBigInts, ethBigInts],
    })

    return hash
  }

  return {
    distributePayout,
  }
}

// Combined hook for handling the full buy-in flow (approve + deposit)
export function useBuyIn() {
  const [step, setStep] = useState<'idle' | 'approving' | 'depositing' | 'complete'>('idle')
  const { approveUSDC, isPending: isApproving, isSuccess: approveSuccess } = useApproveUSDC()
  const { depositUSDC, isPending: isDepositing, isSuccess: depositSuccess } = useDepositUSDC()
  const { allowance, refetch: refetchAllowance } = useUSDCAllowance(undefined) // Will need actual address

  const buyIn = async (gameId: string, amount: number, userAddress: `0x${string}`) => {
    try {
      setStep('approving')

      // Check if we need to approve
      await refetchAllowance()
      const amountBigInt = parseUSDC(amount)

      if (!allowance || allowance < amountBigInt) {
        await approveUSDC(amount)
        // Wait for approval to complete
        while (!approveSuccess) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      setStep('depositing')
      await depositUSDC(gameId, amount)

      setStep('complete')
    } catch (error) {
      setStep('idle')
      throw error
    }
  }

  return {
    buyIn,
    step,
    isPending: isApproving || isDepositing,
    isApproving,
    isDepositing,
  }
}
