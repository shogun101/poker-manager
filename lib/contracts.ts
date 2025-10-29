import { base, baseSepolia } from 'wagmi/chains'
import PokerEscrowABI from './PokerEscrowABI.json'

// Toggle between testnet and mainnet
const USE_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === 'true'

// Contract addresses
export const POKER_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_POKER_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

// USDC addresses
const USDC_ADDRESS_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}` // Real USDC on Base
const USDC_ADDRESS_TESTNET = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}` // Mock USDC on Base Sepolia

export const USDC_ADDRESS = USE_MAINNET ? USDC_ADDRESS_MAINNET : USDC_ADDRESS_TESTNET

// Contract ABIs
export const POKER_ESCROW_ABI = PokerEscrowABI

// USDC ABI (minimal - just approve, balanceOf, allowance)
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
