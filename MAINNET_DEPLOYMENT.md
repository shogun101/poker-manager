# 🚀 Base Mainnet Deployment Guide

## Prerequisites

✅ Base Mainnet ETH for gas fees (~$0.50)
✅ MetaMask, Rainbow, or Coinbase Wallet installed
✅ Foundry installed (already done)

## Step 1: Export Your Private Key

### Option A: From MetaMask (Recommended for Testing)

1. Open MetaMask
2. Click the three dots → Account Details
3. Click "Show Private Key"
4. Enter your password
5. Copy your private key

⚠️ **IMPORTANT:** Use a burner wallet for testing, not your main wallet!

### Option B: Use a Hardware Wallet (More Secure)

Skip to Step 2 and use `--ledger` or `--trezor` flag instead of `--private-key`

## Step 2: Deploy PokerEscrow Contract to Base Mainnet

```bash
cd contracts
source ~/.zshenv

# Deploy using private key (replace YOUR_PRIVATE_KEY)
forge create src/PokerEscrow.sol:PokerEscrow \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args 0x0000000000000000000000000000000000000000
```

### Alternative: Interactive Mode (Safer - Prompts for Private Key)

```bash
forge create src/PokerEscrow.sol:PokerEscrow \
  --rpc-url https://mainnet.base.org \
  --interactive \
  --constructor-args 0x0000000000000000000000000000000000000000
```

## Step 3: Copy the Deployed Contract Address

After deployment, you'll see:

```
Deployer: 0x...
Deployed to: 0xABCDEF1234567890... 👈 COPY THIS ADDRESS
Transaction hash: 0x...
```

**Copy the "Deployed to" address!**

## Step 4: Update Environment Variables

Add the contract address to your `.env.local` file:

```bash
# In the root directory
echo "NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE" >> .env.local
```

Or manually edit `.env.local`:

```env
NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE
```

## Step 5: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add/Update: `NEXT_PUBLIC_POKER_ESCROW_ADDRESS` = `0xYOUR_CONTRACT_ADDRESS_HERE`
5. Click "Save"
6. Redeploy your app

## Step 6: Verify Contract on BaseScan (Optional but Recommended)

```bash
forge verify-contract \
  --rpc-url https://mainnet.base.org \
  --etherscan-api-key YOUR_BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" 0x0000000000000000000000000000000000000000) \
  0xYOUR_CONTRACT_ADDRESS \
  src/PokerEscrow.sol:PokerEscrow
```

Get BaseScan API key at: https://basescan.org/myapikey

## Step 7: Test the Deployment

1. Create a test game in Farcaster Frame
2. Try to buy in with small amount (e.g., 0.1 USDC)
3. Verify transaction on BaseScan: `https://basescan.org/address/0xYOUR_CONTRACT_ADDRESS`

## Contract Details

- **Network:** Base Mainnet (Chain ID: 8453)
- **USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **RPC URL:** `https://mainnet.base.org`
- **Block Explorer:** https://basescan.org

## What the Contract Does

The contract will automatically use **real USDC** on Base Mainnet because we passed `0x0000000000000000000000000000000000000000` as the constructor argument. This makes it default to:

```solidity
USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
```

## Estimated Costs

- **Deployment:** ~$0.10 - $0.50 in ETH (gas fees)
- **Per Buy-in:** ~$0.01 - $0.05 in ETH (gas fees)
- **Settlement:** ~$0.05 - $0.15 in ETH (gas fees)

## Troubleshooting

### "insufficient funds for gas"
→ Add Base ETH to your deployer wallet

### "nonce too low"
→ Your wallet has pending transactions. Wait or use `--nonce` flag

### "invalid constructor arguments"
→ Make sure you're using `0x0000000000000000000000000000000000000000` (42 characters with 0x prefix)

### Contract deployed but not showing up
→ Wait 1-2 minutes for BaseScan to index the transaction

## Next Steps

After deployment:
1. ✅ Contract deployed to mainnet
2. ✅ Environment variables updated
3. ✅ Vercel redeployed
4. 🧪 Test with small USDC amount
5. 🎉 Launch!

---

**Need help?** Check the contract on BaseScan or share the contract address for review.
