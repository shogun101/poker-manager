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
        console.log("Initial balance of deployer:", usdc.balanceOf(msg.sender) / 10**6, "USDC");
    }
}
