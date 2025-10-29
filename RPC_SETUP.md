# RPC Setup Guide

## Problem

You're seeing errors like:
```
Transaction failed: Requested resource not found
Details: block not found: 0x1f72f94
```

This happens because the public Base RPC (`https://sepolia.base.org`) can be unreliable with:
- Rate limiting
- Stale block numbers
- Caching issues
- Downtime

## Solution: Use a Dedicated RPC Provider

You need a dedicated RPC URL from a provider like Alchemy, Infura, or QuickNode.

### Option 1: Alchemy (Recommended - Free Tier Available)

1. **Sign up**: Go to https://www.alchemy.com/
2. **Create an app**:
   - Click "Create new app"
   - Name: "Poker Manager"
   - Chain: Base
   - Network: Base Sepolia (for testnet) OR Base (for mainnet)
3. **Get your RPC URL**:
   - Click on your app
   - Click "API Key"
   - Copy the HTTPS URL (looks like: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`)

4. **Add to your environment**:

For local development (`.env.local`):
```bash
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

For Vercel deployment:
```bash
vercel env add NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL production
# Paste: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY

vercel env add NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL preview
# Paste: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

Or via Vercel Dashboard:
1. Go to your project settings
2. Environment Variables
3. Add `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`
4. Value: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
5. Select: Production, Preview, Development
6. Save and redeploy

### Option 2: Infura

1. Sign up at https://infura.io/
2. Create a new API key
3. Enable Base Sepolia network
4. Get URL: `https://base-sepolia.infura.io/v3/YOUR_API_KEY`
5. Follow same steps as Alchemy above

### Option 3: QuickNode

1. Sign up at https://www.quicknode.com/
2. Create an endpoint for Base Sepolia
3. Copy the HTTP URL
4. Follow same steps as Alchemy above

## For Mainnet

When you're ready to go to mainnet, repeat the process but:
- Choose "Base" instead of "Base Sepolia"
- Set the variable as `NEXT_PUBLIC_BASE_RPC_URL` (without SEPOLIA)
- Also set `NEXT_PUBLIC_USE_MAINNET=true`

## Verify It's Working

After setting up:

1. Redeploy your app (if on Vercel)
2. Check the browser console - you should NOT see "block not found" errors
3. Transactions should work smoothly

## Free Tier Limits

Most providers offer generous free tiers:
- **Alchemy**: 300M compute units/month (plenty for most apps)
- **Infura**: 100K requests/day
- **QuickNode**: 50M credits/month on starter plan

For a poker game app, the free tier should be more than enough!

## Cost Comparison

If you need more:
- **Alchemy**: Pay-as-you-go, ~$199/month for Growth plan
- **Infura**: $50-$225/month for paid plans
- **QuickNode**: $9-$299/month depending on needs

Start with free tier and monitor usage in the provider's dashboard.

