# Deployment Checklist ✅

Use this checklist to track your deployment progress.

## Pre-Deployment

- [ ] Get Base Sepolia ETH from faucet
- [ ] Export private key from wallet
- [ ] Create `contracts/.env` file with:
  - [ ] PRIVATE_KEY
  - [ ] BASE_SEPOLIA_RPC_URL
  - [ ] USDC_ADDRESS
  - [ ] ETHERSCAN_API_KEY (optional)

## Deployment

- [ ] Run deployment command:
  ```bash
  cd contracts
  source ~/.zshenv
  forge script script/DeployPokerEscrow.s.sol:DeployPokerEscrow \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
  ```
- [ ] Copy contract address from output
- [ ] Verify contract appears on Basescan: https://sepolia.basescan.org

## Frontend Configuration

- [ ] Update `.env.local` with contract address:
  ```
  NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0x...
  ```
- [ ] Verify dev server reloaded
- [ ] Check for any console errors in browser

## Get Test Tokens

- [ ] Get testnet USDC from:
  - [ ] https://faucet.circle.com (Circle faucet)
  - [ ] OR deploy MockUSDC contract
  - [ ] OR swap on Uniswap testnet

## Testing

- [ ] Connect wallet on http://localhost:3000
- [ ] Create a test game
  - [ ] Should create on blockchain
  - [ ] Check transaction on Basescan
- [ ] Join game / Buy-in
  - [ ] Approve USDC transaction
  - [ ] Deposit USDC transaction
  - [ ] Verify balance updated on Basescan
- [ ] Settle game (as host)
  - [ ] Enter chip counts
  - [ ] Execute payout distribution
  - [ ] Verify players received payouts

## Verification

- [ ] All transactions visible on Basescan
- [ ] Contract verified and readable
- [ ] No errors in browser console
- [ ] Gas costs are reasonable (testnet)

## Production Prep (When Ready)

- [ ] Test multiple games with multiple players
- [ ] Verify payout calculations are correct
- [ ] Test edge cases (0 buy-ins, refunds, etc.)
- [ ] Deploy to Base Mainnet
- [ ] Update frontend env for mainnet

---

## Quick Commands Reference

**Check contract on Basescan:**
```
https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
```

**Check USDC contract:**
```
https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

**Redeploy if needed:**
```bash
cd contracts
forge script script/DeployPokerEscrow.s.sol:DeployPokerEscrow \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  -vvvv
```

**View contract details:**
```bash
cast call YOUR_CONTRACT_ADDRESS "USDC()(address)" --rpc-url https://sepolia.base.org
```

---

## Environment Variables Summary

### `.env.local` (frontend)
✅ NEXT_PUBLIC_PRIVY_APP_ID=cmh8no0qe00b8ju0epf8yh1hz
✅ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=4d35c7f4c8093647adc2a824416fe5e5
⏳ NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0x... (add after deployment)

### `contracts/.env` (smart contract)
⏳ PRIVATE_KEY=0x... (your wallet private key)
⏳ BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
⏳ USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
⏳ ETHERSCAN_API_KEY=... (optional)

---

Good luck! 🚀
