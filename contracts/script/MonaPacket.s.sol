// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {MonaPacket} from "../src/MonaPacket.sol";
import {MonaPacketNFT} from "../src/MonaPacketNFT.sol";
import {MonaPacketAccount} from "../src/MonaPacketAccount.sol";
import {ERC6551Registry} from "../src/ERC6551Registry.sol";

contract MonaPacketScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log(
            "Deploying MonaPacket contracts with the account:",
            deployerAddress
        );

        vm.startBroadcast(deployerPrivateKey);

        // --- 1. 部署所有合约 ---
        MonaPacketNFT nft = new MonaPacketNFT();
        MonaPacketAccount accountImplementation = new MonaPacketAccount();
        ERC6551Registry registry = new ERC6551Registry();
        MonaPacket monaPacket = new MonaPacket(
            address(nft),
            address(registry),
            address(accountImplementation)
        );
        nft.transferOwnership(address(monaPacket));

        vm.stopBroadcast();

        // --- 2. 打印并保存部署信息 ---
        console.log("--- Deployment Successful ---");
        console.log("MonaPacketNFT deployed to:", address(nft));
        console.log(
            "MonaPacketAccount implementation deployed to:",
            address(accountImplementation)
        );
        console.log("ERC6551Registry deployed to:", address(registry));
        console.log(
            "MonaPacket main contract deployed to:",
            address(monaPacket)
        );

        saveDeploymentInfo(
            deployerAddress,
            monaPacket,
            nft,
            accountImplementation,
            registry
        );
    }

    /**
     * @notice Saves the deployment information to a JSON file using the root key pattern.
     */
    function saveDeploymentInfo(
        address deployerAddress,
        MonaPacket monaPacket,
        MonaPacketNFT nft,
        MonaPacketAccount accountImplementation,
        ERC6551Registry registry
    ) internal {
        string memory path = "./deployments/MonaPacket.json";

        // 1. 定义一个根键 (root key) 来标识我们正在构建的 JSON 对象
        string memory rootKey = "MonaPacketDeployment";

        // 2. 使用 vm.serialize<Type> 向这个由 rootKey 标识的对象中添加数据
        //    第二个参数是 JSON 路径，`.` 用于访问子对象
        vm.serializeAddress(
            rootKey,
            ".deployment.MonaPacket",
            address(monaPacket)
        );
        vm.serializeAddress(rootKey, ".deployment.MonaPacketNFT", address(nft));
        vm.serializeAddress(
            rootKey,
            ".deployment.MonaPacketAccount",
            address(accountImplementation)
        );
        vm.serializeAddress(
            rootKey,
            ".deployment.ERC6551Registry",
            address(registry)
        );
        vm.serializeUint(rootKey, ".deployment.chainId", block.chainid);

        // 3. 在最后一次调用时，捕获完整的 JSON 字符串
        string memory finalJson = vm.serializeAddress(
            rootKey,
            ".deployment.deployerAddress",
            deployerAddress
        );

        // 4. 将完整的 JSON 写入文件
        vm.writeJson(finalJson, path);
        console.log("Deployment info saved to: %s", path);
    }
}
