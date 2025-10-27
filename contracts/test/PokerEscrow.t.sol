// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PokerEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // Mint 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PokerEscrowTest is Test {
    PokerEscrow public escrow;
    MockUSDC public usdc;

    address public host = address(0x1);
    address public player1 = address(0x2);
    address public player2 = address(0x3);
    address public player3 = address(0x4);

    bytes32 public gameId = keccak256("test-game-1");
    uint256 public buyInAmount = 20 * 10**6; // 20 USDC

    event GameCreated(bytes32 indexed gameId, address indexed host);
    event USDCDeposited(bytes32 indexed gameId, address indexed player, uint256 amount);
    event ETHDeposited(bytes32 indexed gameId, address indexed player, uint256 amount);
    event PayoutDistributed(
        bytes32 indexed gameId,
        address indexed player,
        uint256 usdcAmount,
        uint256 ethAmount
    );

    function setUp() public {
        // Deploy contracts
        usdc = new MockUSDC();
        escrow = new PokerEscrow(address(usdc));

        // Give players some USDC
        usdc.mint(host, 1000 * 10**6);
        usdc.mint(player1, 1000 * 10**6);
        usdc.mint(player2, 1000 * 10**6);
        usdc.mint(player3, 1000 * 10**6);

        // Give players some ETH
        vm.deal(host, 100 ether);
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(player3, 100 ether);
    }

    function testCreateGame() public {
        vm.prank(host);
        vm.expectEmit(true, true, false, false);
        emit GameCreated(gameId, host);
        escrow.createGame(gameId);

        (address gameHost, uint256 usdcBalance, uint256 ethBalance, bool exists) = escrow.getGame(gameId);
        assertEq(gameHost, host);
        assertEq(usdcBalance, 0);
        assertEq(ethBalance, 0);
        assertTrue(exists);
    }

    function testCannotCreateDuplicateGame() public {
        vm.prank(host);
        escrow.createGame(gameId);

        vm.prank(host);
        vm.expectRevert(PokerEscrow.GameAlreadyExists.selector);
        escrow.createGame(gameId);
    }

    function testDepositUSDC() public {
        // Create game
        vm.prank(host);
        escrow.createGame(gameId);

        // Approve and deposit
        vm.startPrank(player1);
        usdc.approve(address(escrow), buyInAmount);

        vm.expectEmit(true, true, false, true);
        emit USDCDeposited(gameId, player1, buyInAmount);
        escrow.depositUSDC(gameId, buyInAmount);
        vm.stopPrank();

        // Check balances
        (, uint256 usdcBalance,,) = escrow.getGame(gameId);
        assertEq(usdcBalance, buyInAmount);
        assertEq(usdc.balanceOf(address(escrow)), buyInAmount);
    }

    function testCannotDepositZeroUSDC() public {
        vm.prank(host);
        escrow.createGame(gameId);

        vm.prank(player1);
        vm.expectRevert(PokerEscrow.InvalidAmount.selector);
        escrow.depositUSDC(gameId, 0);
    }

    function testCannotDepositToNonexistentGame() public {
        bytes32 fakeGameId = keccak256("fake-game");

        vm.startPrank(player1);
        usdc.approve(address(escrow), buyInAmount);
        vm.expectRevert(PokerEscrow.GameDoesNotExist.selector);
        escrow.depositUSDC(fakeGameId, buyInAmount);
        vm.stopPrank();
    }

    function testDepositETH() public {
        // Create game
        vm.prank(host);
        escrow.createGame(gameId);

        // Deposit ETH
        vm.prank(player1);
        vm.expectEmit(true, true, false, true);
        emit ETHDeposited(gameId, player1, 1 ether);
        escrow.depositETH{value: 1 ether}(gameId);

        // Check balances
        (,, uint256 ethBalance,) = escrow.getGame(gameId);
        assertEq(ethBalance, 1 ether);
        assertEq(address(escrow).balance, 1 ether);
    }

    function testCannotDepositZeroETH() public {
        vm.prank(host);
        escrow.createGame(gameId);

        vm.prank(player1);
        vm.expectRevert(PokerEscrow.InvalidAmount.selector);
        escrow.depositETH{value: 0}(gameId);
    }

    function testDistributePayoutUSDC() public {
        // Setup: Create game and have 3 players deposit
        vm.prank(host);
        escrow.createGame(gameId);

        // Each player deposits 20 USDC
        address[] memory depositors = new address[](3);
        depositors[0] = player1;
        depositors[1] = player2;
        depositors[2] = player3;

        for (uint i = 0; i < depositors.length; i++) {
            vm.startPrank(depositors[i]);
            usdc.approve(address(escrow), buyInAmount);
            escrow.depositUSDC(gameId, buyInAmount);
            vm.stopPrank();
        }

        // Total pot: 60 USDC
        // Distribution: player1 gets 10, player2 gets 25, player3 gets 25
        address[] memory winners = new address[](3);
        uint256[] memory usdcAmounts = new uint256[](3);
        uint256[] memory ethAmounts = new uint256[](3);

        winners[0] = player1;
        winners[1] = player2;
        winners[2] = player3;

        usdcAmounts[0] = 10 * 10**6;
        usdcAmounts[1] = 25 * 10**6;
        usdcAmounts[2] = 25 * 10**6;

        ethAmounts[0] = 0;
        ethAmounts[1] = 0;
        ethAmounts[2] = 0;

        // Get balances before payout
        uint256 player1BalanceBefore = usdc.balanceOf(player1);
        uint256 player2BalanceBefore = usdc.balanceOf(player2);
        uint256 player3BalanceBefore = usdc.balanceOf(player3);

        // Distribute
        vm.prank(host);
        escrow.distributePayout(gameId, winners, usdcAmounts, ethAmounts);

        // Check balances after
        assertEq(usdc.balanceOf(player1), player1BalanceBefore + 10 * 10**6);
        assertEq(usdc.balanceOf(player2), player2BalanceBefore + 25 * 10**6);
        assertEq(usdc.balanceOf(player3), player3BalanceBefore + 25 * 10**6);

        // Check game balance
        (, uint256 usdcBalance,,) = escrow.getGame(gameId);
        assertEq(usdcBalance, 0);
    }

    function testDistributePayoutETH() public {
        // Setup: Create game and have players deposit ETH
        vm.prank(host);
        escrow.createGame(gameId);

        vm.prank(player1);
        escrow.depositETH{value: 1 ether}(gameId);

        vm.prank(player2);
        escrow.depositETH{value: 1 ether}(gameId);

        // Total pot: 2 ETH
        // Distribution: player1 gets 0.5 ETH, player2 gets 1.5 ETH
        address[] memory winners = new address[](2);
        uint256[] memory usdcAmounts = new uint256[](2);
        uint256[] memory ethAmounts = new uint256[](2);

        winners[0] = player1;
        winners[1] = player2;

        usdcAmounts[0] = 0;
        usdcAmounts[1] = 0;

        ethAmounts[0] = 0.5 ether;
        ethAmounts[1] = 1.5 ether;

        // Get balances before
        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;

        // Distribute
        vm.prank(host);
        escrow.distributePayout(gameId, winners, usdcAmounts, ethAmounts);

        // Check balances after
        assertEq(player1.balance, player1BalanceBefore + 0.5 ether);
        assertEq(player2.balance, player2BalanceBefore + 1.5 ether);

        // Check game balance
        (,, uint256 ethBalance,) = escrow.getGame(gameId);
        assertEq(ethBalance, 0);
    }

    function testDistributePayoutMixed() public {
        // Setup: Create game with both USDC and ETH
        vm.prank(host);
        escrow.createGame(gameId);

        // Deposit USDC
        vm.startPrank(player1);
        usdc.approve(address(escrow), buyInAmount);
        escrow.depositUSDC(gameId, buyInAmount);
        vm.stopPrank();

        // Deposit ETH
        vm.prank(player2);
        escrow.depositETH{value: 1 ether}(gameId);

        // Distribute mixed
        address[] memory winners = new address[](2);
        uint256[] memory usdcAmounts = new uint256[](2);
        uint256[] memory ethAmounts = new uint256[](2);

        winners[0] = player1;
        winners[1] = player2;

        usdcAmounts[0] = 10 * 10**6;
        usdcAmounts[1] = 10 * 10**6;

        ethAmounts[0] = 0.5 ether;
        ethAmounts[1] = 0.5 ether;

        vm.prank(host);
        escrow.distributePayout(gameId, winners, usdcAmounts, ethAmounts);

        // Verify balances updated correctly
        (, uint256 usdcBalance, uint256 ethBalance,) = escrow.getGame(gameId);
        assertEq(usdcBalance, 0);
        assertEq(ethBalance, 0);
    }

    function testOnlyHostCanDistribute() public {
        vm.prank(host);
        escrow.createGame(gameId);

        address[] memory winners = new address[](1);
        uint256[] memory usdcAmounts = new uint256[](1);
        uint256[] memory ethAmounts = new uint256[](1);

        winners[0] = player1;
        usdcAmounts[0] = 0;
        ethAmounts[0] = 0;

        vm.prank(player1);
        vm.expectRevert(PokerEscrow.OnlyHost.selector);
        escrow.distributePayout(gameId, winners, usdcAmounts, ethAmounts);
    }

    function testCannotDistributeMoreThanBalance() public {
        vm.prank(host);
        escrow.createGame(gameId);

        // Only deposit 20 USDC
        vm.startPrank(player1);
        usdc.approve(address(escrow), buyInAmount);
        escrow.depositUSDC(gameId, buyInAmount);
        vm.stopPrank();

        // Try to distribute 30 USDC
        address[] memory winners = new address[](1);
        uint256[] memory usdcAmounts = new uint256[](1);
        uint256[] memory ethAmounts = new uint256[](1);

        winners[0] = player1;
        usdcAmounts[0] = 30 * 10**6;
        ethAmounts[0] = 0;

        vm.prank(host);
        vm.expectRevert(PokerEscrow.InsufficientBalance.selector);
        escrow.distributePayout(gameId, winners, usdcAmounts, ethAmounts);
    }

    function testArrayLengthMismatch() public {
        vm.prank(host);
        escrow.createGame(gameId);

        address[] memory winners = new address[](2);
        uint256[] memory usdcAmounts = new uint256[](1);
        uint256[] memory ethAmounts = new uint256[](2);

        vm.prank(host);
        vm.expectRevert(PokerEscrow.ArrayLengthMismatch.selector);
        escrow.distributePayout(gameId, winners, usdcAmounts, ethAmounts);
    }

    function testPartialDistribution() public {
        // Test that we can distribute only part of the pot
        vm.prank(host);
        escrow.createGame(gameId);

        // Deposit 60 USDC total
        vm.startPrank(player1);
        usdc.approve(address(escrow), 60 * 10**6);
        escrow.depositUSDC(gameId, 60 * 10**6);
        vm.stopPrank();

        // Distribute only 40 USDC
        address[] memory winners = new address[](1);
        uint256[] memory usdcAmounts = new uint256[](1);
        uint256[] memory ethAmounts = new uint256[](1);

        winners[0] = player1;
        usdcAmounts[0] = 40 * 10**6;
        ethAmounts[0] = 0;

        vm.prank(host);
        escrow.distributePayout(gameId, winners, usdcAmounts, ethAmounts);

        // Check remaining balance
        (, uint256 usdcBalance,,) = escrow.getGame(gameId);
        assertEq(usdcBalance, 20 * 10**6);
    }

    function testMultipleDepositsAndDistributions() public {
        // Test multiple rounds of deposits and distributions
        vm.prank(host);
        escrow.createGame(gameId);

        // First round: 2 players deposit
        vm.startPrank(player1);
        usdc.approve(address(escrow), buyInAmount);
        escrow.depositUSDC(gameId, buyInAmount);
        vm.stopPrank();

        vm.startPrank(player2);
        usdc.approve(address(escrow), buyInAmount);
        escrow.depositUSDC(gameId, buyInAmount);
        vm.stopPrank();

        // First distribution
        address[] memory winners1 = new address[](1);
        uint256[] memory usdcAmounts1 = new uint256[](1);
        uint256[] memory ethAmounts1 = new uint256[](1);

        winners1[0] = player1;
        usdcAmounts1[0] = 40 * 10**6;
        ethAmounts1[0] = 0;

        vm.prank(host);
        escrow.distributePayout(gameId, winners1, usdcAmounts1, ethAmounts1);

        // Player3 deposits for second round
        vm.startPrank(player3);
        usdc.approve(address(escrow), buyInAmount);
        escrow.depositUSDC(gameId, buyInAmount);
        vm.stopPrank();

        // Check balance before second distribution
        (, uint256 usdcBalance,,) = escrow.getGame(gameId);
        assertEq(usdcBalance, 20 * 10**6);

        // Second distribution
        address[] memory winners2 = new address[](1);
        uint256[] memory usdcAmounts2 = new uint256[](1);
        uint256[] memory ethAmounts2 = new uint256[](1);

        winners2[0] = player2;
        usdcAmounts2[0] = 20 * 10**6;
        ethAmounts2[0] = 0;

        vm.prank(host);
        escrow.distributePayout(gameId, winners2, usdcAmounts2, ethAmounts2);

        // Final balance should be 0
        (, uint256 finalBalance,,) = escrow.getGame(gameId);
        assertEq(finalBalance, 0);
    }
}
