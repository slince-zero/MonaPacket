// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {MonaPacketScript} from "../script/MonaPacket.s.sol";

contract MonaPacketScriptTest is Test {
    function test_Run_DeploysAndWritesJson() public {
        // Arrange: set env and ensure output dir exists
        string memory priv = "0x1000000000000000000000000000000000000000000000000000000000000001";
        vm.setEnv("PRIVATE_KEY", priv);
        vm.createDir("./deployments", true);

        // Act: run script
        MonaPacketScript script = new MonaPacketScript();
        script.run();

        // Assert: JSON file exists and is not empty
        string memory path = "./deployments/MonaPacket.json";
        string memory json = vm.readFile(path);
        assertGt(bytes(json).length, 0, "json should not be empty");
    }
}


