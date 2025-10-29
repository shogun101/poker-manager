# Vercel Environment Variables Setup

The deployment is failing because environment variables are not set in Vercel. You need to add them to your Vercel project.

## Quick Setup

Go to your Vercel dashboard and add these environment variables:

### Method 1: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project (poker-manager)
3. Go to **Settings** → **Environment Variables**
4. Add each variable below:

```
NEXT_PUBLIC_SUPABASE_URL=https://elfsjkvlfhmmtpfoswxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZnNqa3ZsZmhtbXRwZm9zd3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NTYsImV4cCI6MjA3NjcxNjQ1Nn0.8mpdP9CYzeSyIUGdEYFhhe7wklp_IDbN11G6T-_N55w
NEYNAR_API_KEY=616FB584-1B0B-4399-9C0D-FC7F7BDDCAAE
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_PRIVY_APP_ID=cmh8no0qe00b8ju0epf8yh1hz
NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0xc88419EC9dF535A5f2D96B433FC08033524cF47a
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=4d35c7f4c8093647adc2a824416fe5e5
```

**Important**: For `NEXT_PUBLIC_APP_URL`, use your actual Vercel deployment URL (e.g., `https://poker-manager.vercel.app`)

5. Set environment to: **Production**, **Preview**, and **Development**
6. Click **Save**
7. Go back to **Deployments** and click **Redeploy** on the latest deployment

### Method 2: Via Vercel CLI (Faster)

If you have Vercel CLI installed:

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_PRIVY_APP_ID production
# Paste: cmh8no0qe00b8ju0epf8yh1hz

vercel env add NEXT_PUBLIC_POKER_ESCROW_ADDRESS production
# Paste: 0xc88419EC9dF535A5f2D96B433FC08033524cF47a

vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
# Paste: 4d35c7f4c8093647adc2a824416fe5e5

# Add the rest...
# Then redeploy
vercel --prod
```

## After Adding Environment Variables

1. Redeploy your project (it will automatically redeploy, or click "Redeploy" in Vercel)
2. The build should succeed
3. Your Farcaster Frame will work with blockchain!

## Verify Environment Variables Are Set

After deployment, you can check if they're working:
1. Open your deployed app
2. Open browser console
3. Run: `console.log(process.env)`
4. You should see your `NEXT_PUBLIC_*` variables

## Common Issues

### "Invalid Privy app ID" Error
- Make sure `NEXT_PUBLIC_PRIVY_APP_ID` is set in Vercel
- Make sure it's set for Production, Preview, AND Development environments
- Redeploy after adding

### Environment Variables Not Updating
- After changing env vars in Vercel, you MUST redeploy
- Just saving them doesn't trigger a rebuild
- Click "Redeploy" on the latest deployment

### Still Not Working?
- Clear Vercel cache: Settings → General → Clear Cache
- Then redeploy
