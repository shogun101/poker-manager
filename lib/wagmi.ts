import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'
import { injected, walletConnect, coinbaseWallet } from '@wagmi/connectors'

// Toggle between testnet and mainnet
const USE_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === 'true'
const activeChain = USE_MAINNET ? base : baseSepolia

// RPC URLs - Use custom RPC if provided, otherwise fallback to public
const BASE_MAINNET_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com'

// WalletConnect Project ID (optional - falls back to public)
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a01e2f3b4c5d6e7f8g9h0i1j2k3l4m5n'

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
  connectors: [
    farcasterFrame(),
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Poker Manager',
      preference: 'smartWalletOnly',
    }),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'Poker Manager',
        description: 'Manage poker games with crypto escrow',
        url: 'https://poker-manager.vercel.app',
        icons: ['https://poker-manager.vercel.app/icon.png'],
      },
      showQrModal: true,
    }),
  ],
  ssr: true,
})

export { activeChain }
