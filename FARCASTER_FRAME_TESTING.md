# Testing Blockchain in Farcaster Frame/Mini App

## ✅ Good News!

Your Farcaster Frame CAN interact with blockchain testnets! Here's how:

## How It Works

When a user logs in with Farcaster through Privy:
1. **Privy creates an embedded wallet** automatically
2. This embedded wallet supports **Base Sepolia** (testnet)
3. The user can approve and send transactions on testnet
4. Everything happens inside the Farcaster app!

## The Configuration (Already Set Up)

Your `Providers.tsx` is configured to:
- ✅ Create embedded wallets for all Farcaster users
- ✅ Use Base Sepolia as default chain
- ✅ Enable testnet/sandbox mode
- ✅ No password required for testnet wallets

## Testing Flow in Farcaster

### Step 1: Open in Farcaster
- Open your Frame in Farcaster app
- The user will see "Connect Wallet"
- When they click it, Privy creates an embedded wallet automatically

### Step 2: Get Test USDC to Users

Since users need USDC to test, you have 2 options:

**Option A: Pre-mint USDC to Test Users**

Get their wallet address from Privy and mint USDC:

```bash
# Get user's wallet address from your app (displayed after connection)
# Then mint USDC to them
cast send 0x68a97486105B543B1D98Bbfd056f916b337145c1 \
  "mintUSDC(address,uint256)" \
  USER_WALLET_ADDRESS \
  1000 \
  --rpc-url https://sepolia.base.org \
  --private-key 0x96c865f3d85d7a2ec6d334d98e080f47cfa5be406dec6aa9e80130ee1bafcf12
```

**Option B: Auto-mint on First Join (Better for Testing)**

I can add a feature where the first time someone connects, they automatically get test USDC. Would you like me to add this?

### Step 3: Test the Game Flow

1. User opens Frame in Farcaster
2. Clicks "Create Game" or joins existing game
3. Privy prompts to approve transaction
4. Transaction happens on Base Sepolia
5. Everything works inside Farcaster!

## Important Privy Dashboard Settings

Go to https://dashboard.privy.io and check:

### 1. Enable Farcaster Login
- Settings → Login Methods
- ✅ Enable "Farcaster"

### 2. Enable Base Sepolia
- Settings → Chains
- ✅ Add "Base Sepolia" to supported chains

### 3. Enable Embedded Wallets
- Settings → Embedded Wallets
- ✅ Enable embedded wallets
- ✅ Set to create for "all users"

### 4. Set Redirect URLs
- Settings → General
- Add your app URL: `http://localhost:3000`
- For production: `https://your-domain.vercel.app`

## Viewing Transactions

When users make transactions in the Frame:
- They'll see Privy's transaction confirmation UI
- After confirming, transaction goes to Base Sepolia
- You can view on Basescan: https://sepolia.basescan.org

## Testing Checklist

- [ ] Privy dashboard configured (Farcaster enabled, Base Sepolia added)
- [ ] Open Frame in Farcaster app
- [ ] Connect wallet (embedded wallet created automatically)
- [ ] Get wallet address from UI
- [ ] Mint test USDC to that address
- [ ] Try creating a game (should prompt for transaction)
- [ ] Try buying in (should approve USDC, then deposit)
- [ ] Try settlement (should distribute payouts)

## Common Issues

### "Wrong Network" Error
- Check Privy dashboard has Base Sepolia enabled
- Embedded wallet should default to Base Sepolia

### No USDC Balance
- User needs USDC minted to their embedded wallet
- Get wallet address and mint using command above

### Transaction Not Appearing
- Check Basescan for the wallet address
- Embedded wallet address shown in UI after connection

## For Production (Mainnet)

When going to production:
1. Update Privy to use Base Mainnet
2. Use real USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
3. Update `lib/contracts.ts` with mainnet addresses
4. Users will need real USDC and ETH for gas
5. Everything else stays the same!

## Auto-Minting Feature (Optional)

Would you like me to add:
- Automatic USDC minting when new users connect?
- This would make testing much easier
- Just for testnet, not production

Let me know if you want this! 🚀
