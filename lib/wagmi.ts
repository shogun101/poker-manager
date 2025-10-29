import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'

// Toggle between testnet and mainnet
const USE_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === 'true'
const activeChain = USE_MAINNET ? base : baseSepolia

// RPC URLs - Use custom RPC if provided, otherwise fallback to public
const BASE_MAINNET_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'

export const wagmiConfig = createConfig({
  chains: USE_MAINNET ? [base] : [baseSepolia],
  transports: {
    [base.id]: http(BASE_MAINNET_RPC, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  connectors: [farcasterFrame()],
})

export { activeChain }
