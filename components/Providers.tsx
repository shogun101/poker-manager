'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { baseSepolia } from 'wagmi/chains'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['farcaster'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          createOnLogin: 'all-users', // Create embedded wallet for all Farcaster users
          requireUserPasswordOnCreate: false, // No password needed for testnet
        },
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
        fiatOnRamp: {
          useSandbox: true, // Enable testnet mode
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
