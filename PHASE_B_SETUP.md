# Phase B: Blockchain Integration Setup Guide

This guide will walk you through deploying the smart contract and configuring the app for blockchain functionality.

## Prerequisites

1. **Wallet with Base Sepolia ETH** (for deployment gas)
2. **Privy Account** - Sign up at https://dashboard.privy.io
3. **WalletConnect Project** - Create at https://cloud.walletconnect.com
4. **Base Sepolia Testnet USDC** - You'll need testnet USDC for testing

## Step 1: Get Required API Keys

### 1.1 Privy App ID

1. Go to https://dashboard.privy.io
2. Create a new app or use existing
3. Copy your App ID (looks like `clxxxxx...`)
4. In Privy dashboard:
   - Enable "Farcaster" and "Wallet" login methods
   - Set Base Sepolia as a supported chain
   - Configure redirect URLs to your app domain

### 1.2 WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Create a new project
3. Copy the Project ID

## Step 2: Deploy Smart Contract to Base Sepolia

### 2.1 Prepare Deployment Wallet

1. Export your private key from MetaMask/Rainbow (⚠️ Keep this secure!)
2. Make sure wallet has Base Sepolia ETH for gas

### 2.2 Create Deployment Environment File

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:
```bash
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Circle's USDC on Base Sepolia
```

### 2.3 Deploy the Contract

```bash
cd contracts
source ~/.zshenv

forge script script/DeployPokerEscrow.s.sol:DeployPokerEscrow \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**Important:** Copy the deployed contract address from the output!

Example output:
```
PokerEscrow deployed to: 0x1234567890123456789012345678901234567890
```

## Step 3: Configure Frontend Environment Variables

Update `.env.local` in the project root:

```bash
# Existing vars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEYNAR_API_KEY=your_neynar_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NEW: Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxxxxxxx

# NEW: Smart Contract Configuration
NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0x1234...  # <-- Your deployed contract address

# NEW: Blockchain Configuration
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## Step 4: Get Testnet USDC

You have a few options:

### Option A: Bridge from Sepolia

1. Get Sepolia ETH from https://sepoliafaucet.com
2. Get Sepolia USDC from Circle or Uniswap
3. Bridge to Base Sepolia using https://bridge.base.org

### Option B: Request from Faucet

1. Check https://faucet.circle.com for USDC testnet tokens
2. Select "Base Sepolia" network

### Option C: Deploy Mock USDC (for testing only)

If you can't get testnet USDC, you can deploy a mock:

```solidity
// contracts/src/MockUSDC.sol
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

Deploy it, then update `lib/contracts.ts` with the mock address.

## Step 5: Test the Integration

### 5.1 Start Development Server

```bash
npm run dev
```

### 5.2 Test Flow

1. **Connect Wallet**
   - Open http://localhost:3000
   - Click "Connect Wallet"
   - Connect with Farcaster or external wallet

2. **Create Game**
   - Click "Create Game"
   - Set buy-in amount (e.g., 20 USDC)
   - Click "Create Game"
   - This will:
     - Create game on blockchain
     - Create game in database
     - Redirect to game page

3. **Join/Buy In**
   - On game page, click "Join Game for X USDC"
   - Approve USDC spending (first time only)
   - Deposit USDC to escrow
   - You're now in the game!

4. **Settlement** (Host Only)
   - Start the game
   - Enter final chip counts for each player
   - Click "Settle & End Game"
   - This will:
     - Calculate payouts based on chip counts
     - Distribute USDC from escrow to players
     - Mark game as ended

## Step 6: Verify on Block Explorer

1. Go to https://sepolia.basescan.org
2. Search for your contract address
3. You should see:
   - `GameCreated` events
   - `USDCDeposited` events
   - `PayoutDistributed` events

## Troubleshooting

### "Insufficient balance" errors

- Make sure you have enough USDC in your wallet
- Check the USDC contract address is correct for Base Sepolia

### "Transaction reverted" on deposit

- Ensure you approved USDC spending first
- Check contract address is correct
- Verify game exists on blockchain

### Privy login not working

- Check PRIVY_APP_ID is correct
- Verify Farcaster is enabled in Privy dashboard
- Check redirect URLs match your app domain

### Contract not verified on Basescan

```bash
# Manually verify
cd contracts
forge verify-contract \
  --chain-id 84532 \
  --constructor-args $(cast abi-encode "constructor(address)" "0x036CbD53842c5426634e7929541eC2318f3dCF7e") \
  0xYOUR_CONTRACT_ADDRESS \
  src/PokerEscrow.sol:PokerEscrow \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Next Steps: Moving to Mainnet

When ready for production:

1. Deploy contract to Base Mainnet:
   ```bash
   # Use Base mainnet RPC
   BASE_MAINNET_RPC_URL=https://mainnet.base.org

   # Leave USDC_ADDRESS empty (defaults to Base mainnet USDC)
   USDC_ADDRESS=
   ```

2. Update frontend .env:
   ```bash
   NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0x...  # Mainnet contract
   NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org
   ```

3. Test thoroughly with small amounts first!

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │
         ├─────────┐
         │         │
    ┌────▼───┐  ┌─▼──────────┐
    │Supabase│  │  Blockchain│
    │  (DB)  │  │(Base Sepolia)│
    └────────┘  └─────┬──────┘
                      │
                 ┌────▼────────┐
                 │PokerEscrow  │
                 │  Contract   │
                 │             │
                 │ • createGame│
                 │ • depositUSD│
                 │ • distribute│
                 └─────────────┘
```

## Key Files

- `/contracts/src/PokerEscrow.sol` - Smart contract
- `/lib/contracts.ts` - Contract addresses and ABIs
- `/hooks/usePokerEscrow.ts` - React hooks for contract interaction
- `/components/Providers.tsx` - Privy + Wagmi setup
- `/app/game/[gameCode]/page.tsx` - Main game interface with blockchain
- `/app/create/page.tsx` - Game creation with blockchain

## Support

If you encounter issues:
1. Check browser console for errors
2. Check wallet for pending transactions
3. Verify all environment variables are set
4. Check Basescan for transaction details

Happy gaming! 🎰
