import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
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
  const { writeContractAsync } = useWriteContract()
  const chainId = useChainId()

  const depositUSDC = async (gameId: string, amount: number) => {
    const gameIdBytes = uuidToBytes32(gameId)
    const amountBigInt = parseUSDC(amount)

    const hash = await writeContractAsync({
      address: POKER_ESCROW_ADDRESS,
      abi: POKER_ESCROW_ABI,
      functionName: 'depositUSDC',
      args: [gameIdBytes, amountBigInt],
      chainId,
    })

    return hash
  }

  return {
    depositUSDC,
  }
}

export function useApproveUSDC() {
  const { writeContractAsync } = useWriteContract()
  const chainId = useChainId()

  const approveUSDC = async (amount: number) => {
    const amountBigInt = parseUSDC(amount)

    const hash = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [POKER_ESCROW_ADDRESS, amountBigInt],
      chainId,
    })

    return hash
  }

  return {
    approveUSDC,
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
      staleTime: 2000,
      gcTime: 5000,
      refetchOnWindowFocus: false,
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
      staleTime: 2000,
      gcTime: 5000,
      refetchOnWindowFocus: false,
    },
  })

  return {
    balance: balance as bigint | undefined,
    refetch,
  }
}

export function useDistributePayout() {
  const { writeContractAsync } = useWriteContract()
  const chainId = useChainId()

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
      chainId,
    })

    return hash
  }

  return {
    distributePayout,
  }
}
