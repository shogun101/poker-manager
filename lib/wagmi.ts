import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'

// Toggle between testnet and mainnet
const USE_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === 'true'
const activeChain = USE_MAINNET ? base : baseSepolia

// RPC URLs - Use custom RPC if provided, otherwise fallback to public
const BASE_MAINNET_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com'

// WalletConnect Project ID (get your own at https://cloud.walletconnect.com)
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a01e2f3b4c5d6e7f8g9h0i1j2k3l4m5n'

// Configure RainbowKit wallets
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'Poker Manager',
    projectId: WALLETCONNECT_PROJECT_ID,
  }
)

// For mainnet, we'll add Farcaster connector
// For testnet, we exclude Farcaster due to compatibility issues
const allConnectors = USE_MAINNET
  ? [farcasterFrame(), ...connectors]
  : connectors

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
  connectors: allConnectors,
  ssr: true,
})

export { activeChain }
