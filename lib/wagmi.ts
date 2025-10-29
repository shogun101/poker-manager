import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'

// Toggle between testnet and mainnet
const USE_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === 'true'
const activeChain = USE_MAINNET ? base : baseSepolia

export const wagmiConfig = createConfig({
  chains: [activeChain],
  transports: {
    [activeChain.id]: http(),
  },
  connectors: [farcasterFrame()],
})

export { activeChain }
