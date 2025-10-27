import { http } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { createConfig } from '@privy-io/wagmi'

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
})
