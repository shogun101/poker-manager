// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PokerEscrow
 * @notice Escrow contract for IRL poker games with USDC/ETH deposits
 * @dev Simple escrow - host deposits, host distributes. Built for Base.
 */
contract PokerEscrow {
    using SafeERC20 for IERC20;

    // USDC token (can be set in constructor for testing, defaults to Base mainnet)
    IERC20 public immutable USDC;

    struct Game {
        address host;
        uint256 usdcBalance;
        uint256 ethBalance;
        bool exists;
    }

    // gameId => Game
    mapping(bytes32 => Game) public games;

    // Events
    event GameCreated(bytes32 indexed gameId, address indexed host);
    event USDCDeposited(bytes32 indexed gameId, address indexed player, uint256 amount);
    event ETHDeposited(bytes32 indexed gameId, address indexed player, uint256 amount);
    event PayoutDistributed(
        bytes32 indexed gameId,
        address indexed player,
        uint256 usdcAmount,
        uint256 ethAmount
    );

    error GameDoesNotExist();
    error GameAlreadyExists();
    error OnlyHost();
    error InvalidAmount();
    error InsufficientBalance();
    error TransferFailed();
    error ArrayLengthMismatch();

    /**
     * @notice Constructor
     * @param _usdc USDC token address (use Base mainnet address in production)
     */
    constructor(address _usdc) {
        // Default to Base mainnet USDC if zero address is passed
        USDC = _usdc == address(0)
            ? IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
            : IERC20(_usdc);
    }

    /**
     * @notice Create a new game
     * @param gameId Unique identifier for the game (can be Supabase UUID)
     */
    function createGame(bytes32 gameId) external {
        if (games[gameId].exists) revert GameAlreadyExists();

        games[gameId] = Game({
            host: msg.sender,
            usdcBalance: 0,
            ethBalance: 0,
            exists: true
        });

        emit GameCreated(gameId, msg.sender);
    }

    /**
     * @notice Deposit USDC for a buy-in
     * @param gameId The game to deposit to
     * @param amount Amount of USDC to deposit (in USDC decimals - 6)
     */
    function depositUSDC(bytes32 gameId, uint256 amount) external {
        if (!games[gameId].exists) revert GameDoesNotExist();
        if (amount == 0) revert InvalidAmount();

        games[gameId].usdcBalance += amount;

        // Transfer USDC from player to contract
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        emit USDCDeposited(gameId, msg.sender, amount);
    }

    /**
     * @notice Deposit ETH for a buy-in
     * @param gameId The game to deposit to
     */
    function depositETH(bytes32 gameId) external payable {
        if (!games[gameId].exists) revert GameDoesNotExist();
        if (msg.value == 0) revert InvalidAmount();

        games[gameId].ethBalance += msg.value;

        emit ETHDeposited(gameId, msg.sender, msg.value);
    }

    /**
     * @notice Distribute payouts to players (host only)
     * @param gameId The game to distribute payouts for
     * @param players Array of player addresses
     * @param usdcAmounts Array of USDC amounts to send to each player
     * @param ethAmounts Array of ETH amounts to send to each player
     */
    function distributePayout(
        bytes32 gameId,
        address[] calldata players,
        uint256[] calldata usdcAmounts,
        uint256[] calldata ethAmounts
    ) external {
        Game storage game = games[gameId];

        if (!game.exists) revert GameDoesNotExist();
        if (msg.sender != game.host) revert OnlyHost();
        if (players.length != usdcAmounts.length || players.length != ethAmounts.length) {
            revert ArrayLengthMismatch();
        }

        uint256 totalUSDC = 0;
        uint256 totalETH = 0;

        // Calculate totals
        for (uint256 i = 0; i < players.length; i++) {
            totalUSDC += usdcAmounts[i];
            totalETH += ethAmounts[i];
        }

        // Check we have enough balance
        if (totalUSDC > game.usdcBalance) revert InsufficientBalance();
        if (totalETH > game.ethBalance) revert InsufficientBalance();

        // Update balances
        game.usdcBalance -= totalUSDC;
        game.ethBalance -= totalETH;

        // Distribute payouts
        for (uint256 i = 0; i < players.length; i++) {
            if (usdcAmounts[i] > 0) {
                USDC.safeTransfer(players[i], usdcAmounts[i]);
            }

            if (ethAmounts[i] > 0) {
                (bool success,) = players[i].call{value: ethAmounts[i]}("");
                if (!success) revert TransferFailed();
            }

            emit PayoutDistributed(gameId, players[i], usdcAmounts[i], ethAmounts[i]);
        }
    }

    /**
     * @notice Get game details
     * @param gameId The game ID to query
     * @return host The host address
     * @return usdcBalance Current USDC balance
     * @return ethBalance Current ETH balance
     * @return exists Whether the game exists
     */
    function getGame(bytes32 gameId)
        external
        view
        returns (address host, uint256 usdcBalance, uint256 ethBalance, bool exists)
    {
        Game memory game = games[gameId];
        return (game.host, game.usdcBalance, game.ethBalance, game.exists);
    }
}
