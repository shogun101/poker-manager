# Poker Escrow Smart Contract

Smart contract for managing poker game deposits and payouts on Base.

## Overview

The `PokerEscrow` contract provides a simple escrow system for IRL poker games:
- Host creates a game
- Players deposit USDC or ETH for buy-ins
- Host distributes payouts at the end of the game

## Features

- **USDC and ETH support**: Accept deposits in both USDC and native ETH
- **Host-controlled payouts**: Only the game host can distribute winnings
- **Flexible distributions**: Host can distribute any amounts, partial payouts, multiple rounds
- **Game tracking**: Each game has a unique ID (can use Supabase UUID)
- **Events**: All actions emit events for frontend integration

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Setup

```bash
# Install dependencies
forge install

# Compile contracts
forge build

# Run tests
forge test -vv
```

### Testing

The contract includes comprehensive tests covering:
- Game creation
- USDC deposits
- ETH deposits
- Payout distribution (USDC, ETH, and mixed)
- Access control (only host can distribute)
- Edge cases (insufficient balance, array mismatches, etc.)
- Multiple rounds of deposits and distributions

Run tests with:
```bash
forge test -vv
```

## Deployment

### Base Sepolia (Testnet)

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in your `.env` file:
```
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
USDC_ADDRESS=  # Optional: testnet USDC address
```

3. Deploy:
```bash
source ../.zshenv
forge script script/DeployPokerEscrow.s.sol:DeployPokerEscrow \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### Base Mainnet

1. Update your `.env` with mainnet RPC and leave `USDC_ADDRESS` empty (it will use Base mainnet USDC by default):
```
BASE_MAINNET_RPC_URL=https://mainnet.base.org
USDC_ADDRESS=  # Leave empty for mainnet USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
```

2. Deploy:
```bash
source ../.zshenv
forge script script/DeployPokerEscrow.s.sol:DeployPokerEscrow \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify
```

## Contract Interface

### Functions

#### `createGame(bytes32 gameId)`
Creates a new poker game. The caller becomes the host.

#### `depositUSDC(bytes32 gameId, uint256 amount)`
Deposit USDC for a buy-in. Requires prior approval of USDC to the contract.

#### `depositETH(bytes32 gameId)`
Deposit ETH for a buy-in. Send ETH with the transaction.

#### `distributePayout(bytes32 gameId, address[] players, uint256[] usdcAmounts, uint256[] ethAmounts)`
Distribute payouts to players. Only callable by the game host.

#### `getGame(bytes32 gameId)`
Get game details including host, balances, and existence status.

### Events

```solidity
event GameCreated(bytes32 indexed gameId, address indexed host);
event USDCDeposited(bytes32 indexed gameId, address indexed player, uint256 amount);
event ETHDeposited(bytes32 indexed gameId, address indexed player, uint256 amount);
event PayoutDistributed(bytes32 indexed gameId, address indexed player, uint256 usdcAmount, uint256 ethAmount);
```

## Security Considerations

- **Trust model**: This contract uses a simple trust model where the host has full control over payout distribution. This is intentional for IRL poker games where the host is trusted.
- **No validation**: The contract does not validate that payouts match deposits. The host can distribute any amounts up to the available balance.
- **SafeERC20**: Uses OpenZeppelin's SafeERC20 for secure token transfers.
- **Reentrancy**: ETH transfers use `.call{value:}()` with proper balance updates before transfers.

## Frontend Integration

The contract is designed to integrate with a Next.js frontend using Wagmi/viem:

1. Connect wallet with Privy
2. Create game: call `createGame` with Supabase game UUID converted to bytes32
3. Buy-in: call `depositUSDC` or `depositETH`
4. Settlement: call `distributePayout` with arrays of players and amounts
5. Listen to events for real-time updates

## License

MIT
