import { http, createConfig } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  connectors: [farcasterFrame()],
})
