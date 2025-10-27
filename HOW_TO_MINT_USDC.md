# How to Mint Test USDC

Since the mint page was removed from the main flow, here's how to mint USDC for testing:

## Option 1: Using Cast (Command Line)

```bash
# Mint 1000 USDC to your wallet
cast send 0x68a97486105B543B1D98Bbfd056f916b337145c1 \
  "mintUSDC(address,uint256)" \
  YOUR_WALLET_ADDRESS \
  1000 \
  --rpc-url https://sepolia.base.org \
  --private-key 0x96c865f3d85d7a2ec6d334d98e080f47cfa5be406dec6aa9e80130ee1bafcf12

# Check balance
cast call 0x68a97486105B543B1D98Bbfd056f916b337145c1 \
  "balanceOf(address)(uint256)" \
  YOUR_WALLET_ADDRESS \
  --rpc-url https://sepolia.base.org
```

## Option 2: Using Basescan

1. Go to https://sepolia.basescan.org/address/0x68a97486105B543B1D98Bbfd056f916b337145c1#writeContract

2. Click "Connect to Web3" and connect your wallet

3. Find the `mintUSDC` function

4. Enter:
   - `to`: Your wallet address
   - `amountInUSDC`: Amount you want (e.g., 1000 for 1000 USDC)

5. Click "Write" and confirm the transaction

## Option 3: Mint to Multiple Wallets

If you want to distribute USDC to multiple test wallets:

```bash
# Create a script
cat > mint_to_wallets.sh << 'EOF'
#!/bin/bash

USDC="0x68a97486105B543B1D98Bbfd056f916b337145c1"
RPC="https://sepolia.base.org"
PK="0x96c865f3d85d7a2ec6d334d98e080f47cfa5be406dec6aa9e80130ee1bafcf12"

# List of wallet addresses to mint to
WALLETS=(
  "0x1234..."  # Add wallet addresses here
  "0x5678..."
)

for wallet in "${WALLETS[@]}"; do
  echo "Minting 1000 USDC to $wallet"
  cast send $USDC \
    "mintUSDC(address,uint256)" \
    $wallet \
    1000 \
    --rpc-url $RPC \
    --private-key $PK
done
EOF

chmod +x mint_to_wallets.sh
./mint_to_wallets.sh
```

## Contract Details

**Mock USDC Contract:**
- Address: `0x68a97486105B543B1D98Bbfd056f916b337145c1`
- Network: Base Sepolia
- Functions:
  - `mintUSDC(address to, uint256 amountInUSDC)` - Mint USDC (amount is in whole USDC, e.g., 1000)
  - `balanceOf(address account)` - Check balance (returns amount with 6 decimals)
  - `approve(address spender, uint256 amount)` - Approve spending

**View on Basescan:**
https://sepolia.basescan.org/address/0x68a97486105B543B1D98Bbfd056f916b337145c1

## Quick Mint Command

For quick testing, use this one-liner (replace YOUR_WALLET):

```bash
cd contracts && source ~/.zshenv && cast send 0x68a97486105B543B1D98Bbfd056f916b337145c1 "mintUSDC(address,uint256)" YOUR_WALLET 1000 --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY
```
