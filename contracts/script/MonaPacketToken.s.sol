// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {MonaPacketToken} from "../src/MonaPacketToken.sol";

contract MonaPacketTokenScript is Script {
    // Set the initial supply to be minted to the deployer.
    // e.g., 1,000,000 tokens with 18 decimals.
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * (10 ** 18);

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log(
            "Deploying MonaPacketToken with the account:",
            deployerAddress
        );

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the token contract, setting the deployer as the initial owner.
        MonaPacketToken token = new MonaPacketToken(deployerAddress);
        console.log("MonaPacketToken deployed to:", address(token));

        // 2. Mint the initial supply to the deployer's address.
        token.mint(deployerAddress, INITIAL_SUPPLY);
        console.log(
            "Minted %s MPKT to %s",
            INITIAL_SUPPLY / (10 ** 18),
            deployerAddress
        );

        vm.stopBroadcast();

        // 3. Save the deployment information to a file.
        saveDeploymentInfo(deployerAddress, address(token));
    }

    function saveDeploymentInfo(
        address deployerAddress,
        address tokenAddress
    ) internal {
        string memory path = "./deployments/MonaPacketToken.json";
        string memory rootKey = "MonaPacketTokenDeployment";

        vm.serializeAddress(rootKey, ".deployment.tokenAddress", tokenAddress);
        vm.serializeUint(rootKey, ".deployment.chainId", block.chainid);
        string memory finalJson = vm.serializeAddress(
            rootKey,
            ".deployment.deployerAddress",
            deployerAddress
        );

        vm.writeJson(finalJson, path);
        console.log(" Deployment info saved to: %s", path);
    }
}
