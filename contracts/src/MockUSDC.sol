// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing on Base Sepolia
 * @dev Anyone can mint tokens for testing purposes
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint 1 million USDC to deployer initially
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDC has 6 decimals
    }

    /**
     * @notice Mint tokens to any address (for testing)
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in USDC units, e.g., 1000000 = 1 USDC)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Convenient function to mint USDC with decimal conversion
     * @param to Address to mint tokens to
     * @param amountInUSDC Amount in whole USDC (e.g., 100 for 100 USDC)
     */
    function mintUSDC(address to, uint256 amountInUSDC) external {
        _mint(to, amountInUSDC * 10**6);
    }
}
