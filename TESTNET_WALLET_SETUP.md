# Setting Up Wallet for Base Sepolia Testing

## The Issue with Farcaster Wallet

**Farcaster's built-in wallet only supports mainnet chains.** It cannot interact with testnets like Base Sepolia.

For testing, you need to use an **external wallet** (MetaMask, Rainbow, Coinbase Wallet) that supports testnets.

## Setup Guide

### Step 1: Install a Wallet

Choose one:
- **MetaMask**: https://metamask.io
- **Rainbow**: https://rainbow.me
- **Coinbase Wallet**: https://www.coinbase.com/wallet

### Step 2: Add Base Sepolia Network

#### MetaMask:
1. Open MetaMask
2. Click network dropdown (top left)
3. Click "Add Network"
4. Click "Add a network manually"
5. Enter these details:

```
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
```

6. Click "Save"

#### Rainbow / Coinbase Wallet:
1. Go to Settings → Networks
2. Enable "Testnets" or "Show test networks"
3. Select "Base Sepolia"

### Step 3: Get Test ETH

1. Go to https://www.alchemy.com/faucets/base-sepolia
2. Connect your wallet
3. Request testnet ETH (free!)

### Step 4: Mint Test USDC

Use the command from `HOW_TO_MINT_USDC.md`:

```bash
cast send 0x68a97486105B543B1D98Bbfd056f916b337145c1 \
  "mintUSDC(address,uint256)" \
  YOUR_WALLET_ADDRESS \
  1000 \
  --rpc-url https://sepolia.base.org \
  --private-key 0x96c865f3d85d7a2ec6d334d98e080f47cfa5be406dec6aa9e80130ee1bafcf12
```

Or use Basescan:
1. Go to https://sepolia.basescan.org/address/0x68a97486105B543B1D98Bbfd056f916b337145c1#writeContract
2. Click "Connect to Web3"
3. Find `mintUSDC` function
4. Enter your address and amount (e.g., 1000)
5. Click "Write"

### Step 5: Connect to Your App

1. Go to http://localhost:3000
2. Click "Connect Wallet"
3. Choose **"Connect with Wallet"** (not Farcaster!)
4. Select your wallet (MetaMask/Rainbow/etc.)
5. Approve connection
6. **Important**: Make sure your wallet is on Base Sepolia network!

### Step 6: Test the Flow

Now you can:
1. Create a game (blockchain transaction!)
2. Join/buy-in (approve + deposit USDC)
3. Settle game (distribute payouts)

All transactions will appear on Basescan!

## Troubleshooting

### "Wrong Network" Error
- Make sure your wallet is on **Base Sepolia** (not Ethereum Sepolia or mainnet)
- Switch network in your wallet

### Can't See USDC Balance
- Check you minted USDC to the correct address
- View balance on Basescan: https://sepolia.basescan.org/address/YOUR_ADDRESS

### Farcaster Login Doesn't Work
- Farcaster wallet doesn't support testnets
- Use "Connect with Wallet" option instead
- In production (mainnet), Farcaster will work fine

## For Production (Mainnet)

When ready to go live:
1. Deploy contracts to Base Mainnet
2. Use real USDC address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
3. Farcaster wallet will work perfectly
4. Users can login with Farcaster OR external wallets

## Network Comparison

| Feature | Base Sepolia (Testnet) | Base Mainnet |
|---------|------------------------|--------------|
| Farcaster Wallet | ❌ Not supported | ✅ Works |
| External Wallets | ✅ Works | ✅ Works |
| USDC | Mock (free) | Real ($$$) |
| ETH | Free from faucet | Costs real money |
| Purpose | Testing | Production |

## Quick Reference

**Your Contracts:**
- PokerEscrow: `0xc88419EC9dF535A5f2D96B433FC08033524cF47a`
- Mock USDC: `0x68a97486105B543B1D98Bbfd056f916b337145c1`

**Network Details:**
- Network: Base Sepolia
- Chain ID: 84532
- RPC: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org

**Wallet Options for Testing:**
- ✅ MetaMask (recommended)
- ✅ Rainbow
- ✅ Coinbase Wallet
- ❌ Farcaster (testnet not supported)
