# Smart Contract Deployment Guide

## Step 1: Get Base Sepolia ETH

1. Go to one of these faucets:
   - https://www.alchemy.com/faucets/base-sepolia
   - https://coinbase.com/faucets/base-ethereum-sepolia-faucet

2. Connect your wallet and request testnet ETH (it's free)

3. Verify you received it by checking your wallet

## Step 2: Prepare Deployment Environment

Navigate to the contracts directory and create the `.env` file:

```bash
cd contracts
```

Create a new file called `.env` with the following content:

```bash
# Your wallet private key (⚠️ NEVER commit this to git!)
PRIVATE_KEY=0xyour_private_key_here

# Base Sepolia RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Base Sepolia USDC address (Circle's official testnet USDC)
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Optional: Etherscan API key for contract verification
# Get from https://basescan.org/myapikey
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**Important:**
- Replace `0xyour_private_key_here` with your actual private key
- The `.env` file is already in `.gitignore`, so it won't be committed
- Make sure your private key starts with `0x`

## Step 3: Deploy the Contract

Run the deployment script:

```bash
source ~/.zshenv
forge script script/DeployPokerEscrow.s.sol:DeployPokerEscrow \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

**What this does:**
- Deploys the PokerEscrow contract to Base Sepolia
- Uses the USDC address from your `.env` file
- Verifies the contract on Basescan (if you provided an API key)
- Shows verbose output so you can see what's happening

## Step 4: Copy the Contract Address

After deployment, you'll see output like this:

```
== Logs ==
  PokerEscrow deployed to: 0x1234567890123456789012345678901234567890
  Using USDC address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e

## Setting up 1 EVM...
✅ [0] Base Sepolia
...
✅ Sequence #1 on base-sepolia | Total Paid: 0.000123456789 ETH
```

**Copy the contract address** (the long `0x123...` address after "PokerEscrow deployed to:")

## Step 5: Update Frontend Environment

Go back to the project root and update `.env.local`:

```bash
cd ..  # Back to project root
```

Edit `.env.local` and update this line:

```bash
# Replace with your deployed contract address
NEXT_PUBLIC_POKER_ESCROW_ADDRESS=0x1234567890123456789012345678901234567890
```

The dev server will automatically reload with the new contract address.

## Step 6: Verify on Basescan

1. Go to https://sepolia.basescan.org
2. Paste your contract address in the search bar
3. You should see:
   - Contract creation transaction
   - Verified contract code (if verification succeeded)
   - Read/Write contract functions

## Step 7: Get Testnet USDC

You need testnet USDC to test the buy-in flow. Options:

### Option A: Circle Faucet (Easiest)
1. Go to https://faucet.circle.com
2. Select "Base Sepolia" network
3. Enter your wallet address
4. Request USDC

### Option B: Uniswap Testnet
1. Go to https://app.uniswap.org
2. Switch to Base Sepolia network
3. Swap testnet ETH for USDC

### Option C: Deploy Mock USDC (for development only)

If you can't get real testnet USDC, you can deploy a mock:

```bash
cd contracts

# Create the mock USDC contract
cat > src/MockUSDC.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint 1 million USDC to deployer
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
EOF

# Create deployment script
cat > script/DeployMockUSDC.s.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";

contract DeployMockUSDC is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();

        vm.stopBroadcast();

        console.log("MockUSDC deployed to:", address(usdc));
    }
}
EOF

# Deploy mock USDC
forge script script/DeployMockUSDC.s.sol:DeployMockUSDC \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast

# Update lib/contracts.ts with the mock USDC address
```

Then update `lib/contracts.ts`:
```typescript
export const USDC_ADDRESS_SEPOLIA = '0xYOUR_MOCK_USDC_ADDRESS' as `0x${string}`
```

## Troubleshooting

### Error: "Insufficient funds"
- You need Base Sepolia ETH for gas
- Go to a faucet and get more testnet ETH

### Error: "Invalid private key"
- Make sure your private key in `.env` starts with `0x`
- Check there are no extra spaces or quotes

### Contract verification failed
- This is okay! The contract is still deployed
- You can verify manually later with:
```bash
forge verify-contract \
  --chain-id 84532 \
  --constructor-args $(cast abi-encode "constructor(address)" "$USDC_ADDRESS") \
  YOUR_CONTRACT_ADDRESS \
  src/PokerEscrow.sol:PokerEscrow \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Can't find `foundryup` or `forge`
```bash
# Reinstall Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
source ~/.zshenv
```

## Testing Your Deployment

Once everything is deployed:

1. **Check contract on Basescan:**
   ```
   https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS
   ```

2. **Test the frontend:**
   - Go to http://localhost:3000
   - Click "Connect Wallet"
   - Connect with Farcaster or external wallet
   - Try creating a game (this will call the blockchain!)

3. **Monitor transactions:**
   - Every blockchain action will appear on Basescan
   - You can track gas costs, events, etc.

## What's Deployed

Your PokerEscrow contract includes:
- ✅ `createGame(bytes32 gameId)` - Create escrow for a game
- ✅ `depositUSDC(bytes32 gameId, uint256 amount)` - Deposit USDC buy-ins
- ✅ `depositETH(bytes32 gameId)` - Deposit ETH buy-ins (if needed)
- ✅ `distributePayout(...)` - Host distributes winnings
- ✅ `getGame(bytes32 gameId)` - View game details

All tested with 15 passing tests! ✅

## Next Steps After Deployment

1. **Test create game flow** - Make sure blockchain game creation works
2. **Test buy-in flow** - Approve USDC → Deposit to escrow
3. **Test settlement** - Distribute payouts from escrow
4. **Monitor gas costs** - See how much transactions cost on testnet

Good luck with the deployment! 🚀
