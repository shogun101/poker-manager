import { baseSepolia } from 'wagmi/chains'
import PokerEscrowABI from './PokerEscrowABI.json'

// Contract addresses
export const POKER_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_POKER_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

// Base Sepolia Mock USDC (deployed for testing - can mint unlimited tokens!)
export const USDC_ADDRESS_SEPOLIA = '0x68a97486105B543B1D98Bbfd056f916b337145c1' as `0x${string}` // Mock USDC on Base Sepolia

// Contract ABIs
export const POKER_ESCROW_ABI = PokerEscrowABI as const

// USDC ABI (minimal - just approve, balanceOf, and mint for testing)
export const USDC_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'mintUSDC',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amountInUSDC', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

// Helper to convert UUID to bytes32
export function uuidToBytes32(uuid: string): `0x${string}` {
  // Remove hyphens from UUID
  const hex = uuid.replace(/-/g, '')
  // Pad to 64 characters (32 bytes)
  const padded = hex.padEnd(64, '0')
  return `0x${padded}` as `0x${string}`
}

// Helper to format USDC amount (6 decimals)
export function formatUSDC(amount: bigint): string {
  const value = Number(amount) / 1e6
  return value.toFixed(2)
}

// Helper to parse USDC amount to contract format
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e6))
}
