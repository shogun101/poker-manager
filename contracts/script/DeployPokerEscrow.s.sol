// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PokerEscrow.sol";

contract DeployPokerEscrow is Script {
    function run() external {
        // Base Sepolia USDC address
        // Note: You'll need to verify this is the correct testnet USDC address
        // For Base Sepolia, you might need to deploy a mock USDC or use the official testnet USDC
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0));

        // If USDC_ADDRESS is not set or is zero, it will default to Base mainnet USDC
        // For testnet deployment, you should set USDC_ADDRESS in your .env file

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        PokerEscrow escrow = new PokerEscrow(usdcAddress);

        vm.stopBroadcast();

        console.log("PokerEscrow deployed to:", address(escrow));
        console.log("Using USDC address:", address(escrow.USDC()));
    }
}
