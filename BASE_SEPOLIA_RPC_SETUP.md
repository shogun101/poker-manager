# Base Sepolia RPC Setup (Fix "block not found" Error)

## Quick Fix - Get Your Base Sepolia RPC from Alchemy

You already have an Alchemy account (you have the mainnet RPC), now you need the Base Sepolia one:

### Step 1: Get Base Sepolia RPC URL

1. Go to https://dashboard.alchemy.com/
2. Click **"Create new app"** (or use existing)
3. Fill in:
   - Name: `Poker Manager Sepolia`
   - Chain: **Base**
   - Network: **Base Sepolia** ⚠️ (NOT Base Mainnet!)
4. Click **"Create app"**
5. Click on your new app
6. Click **"API Key"** 
7. Copy the **HTTPS URL** (looks like: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`)

### Step 2: Add to Local Environment

Create/update your `.env.local` file:

```bash
# Copy this into .env.local
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# You already have these, keep them:
NEXT_PUBLIC_SUPABASE_URL=https://elfsjkvlfhmmtpfoswxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZnNqa3ZsZmhtbXRwZm9zd3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NTYsImV4cCI6MjA3NjcxNjQ1Nn0.8mpdP9CYzeSyIUGdEYFhhe7wklp_IDbN11G6T-_N55w
NEYNAR_API_KEY=616FB584-1B0B-4399-9C0D-FC7F7BDDCAAE
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PRIVY_APP_ID=cmh8no0qe00b8ju0epf8yh1hz
NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0xc88419EC9dF535A5f2D96B433FC08033524cF47a
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=4d35c7f4c8093647adc2a824416fe5e5
NEXT_PUBLIC_USE_MAINNET=false
```

### Step 3: Restart Your Dev Server

```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Add to Vercel (for Production)

```bash
# Via CLI:
vercel env add NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL production
# Paste: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY

vercel env add NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL preview
# Paste: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Then redeploy:
vercel --prod
```

Or via Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add: `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`
5. Value: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
6. Select: Production, Preview, Development
7. Save
8. Go to Deployments → Click "Redeploy" on latest

## Verify It's Working

After setup, you should see in the console:
```
✅ Using Alchemy RPC for Base Sepolia
✅ Wallet connected: 0x...
✅ USDC balance loaded
✅ Transaction submitted
```

No more "block not found" errors!

## Future: Mainnet RPC (Already Have This)

When you're ready to go to mainnet:
```bash
NEXT_PUBLIC_USE_MAINNET=true
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/B9OKRG-eYsS_dEU6f6lQ0
```

But stay on Sepolia testnet for now!

