// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/ERC6551Registry.sol";
import "../src/MonaPacketNFT.sol";
import "../src/MonaPacketAccount.sol";

contract ERC6551RegistryTest is Test {
    ERC6551Registry public registry;
    MonaPacketNFT public nft;
    MonaPacketAccount public implementation;

    function setUp() public {
        registry = new ERC6551Registry();
        nft = new MonaPacketNFT();
        implementation = new MonaPacketAccount();
    }

    function test_CreateAccount_FirstDeployment_EmitsEventAndMatchesPrediction() public {
        bytes32 salt = bytes32(0);
        uint256 chainId = block.chainid;
        uint256 tokenId = 123;

        address predicted = registry.account(address(implementation), salt, chainId, address(nft), tokenId);

        vm.recordLogs();
        address deployed = registry.createAccount(address(implementation), salt, chainId, address(nft), tokenId);
        Vm.Log[] memory entries = vm.getRecordedLogs();

        // should deploy to predicted address
        assertEq(deployed, predicted);
        // code should exist at deployed address
        uint256 size;
        assembly {
            size := extcodesize(deployed)
        }
        assertGt(size, 0);

        // ERC6551AccountCreated should be emitted exactly once
        bytes32 topic0 = keccak256(
            "ERC6551AccountCreated(address,address,bytes32,uint256,address,uint256)"
        );
        uint256 count;
        for (uint256 i; i < entries.length; i++) {
            if (entries[i].topics.length > 0 && entries[i].topics[0] == topic0) {
                count++;
            }
        }
        assertEq(count, 1);
    }

    function test_CreateAccount_SecondCall_ReturnsSameAddress_NoSecondEvent() public {
        bytes32 salt = bytes32(0);
        uint256 chainId = block.chainid;
        uint256 tokenId = 456;

        // first call deploys and emits
        vm.recordLogs();
        address a1 = registry.createAccount(address(implementation), salt, chainId, address(nft), tokenId);
        Vm.Log[] memory first = vm.getRecordedLogs();

        // second call hits the already-deployed branch (returns computed address, no deploy)
        vm.recordLogs();
        address a2 = registry.createAccount(address(implementation), salt, chainId, address(nft), tokenId);
        Vm.Log[] memory second = vm.getRecordedLogs();

        assertEq(a1, a2);

        bytes32 topic0 = keccak256(
            "ERC6551AccountCreated(address,address,bytes32,uint256,address,uint256)"
        );

        // first call emitted exactly one
        uint256 count1;
        for (uint256 i; i < first.length; i++) {
            if (first[i].topics.length > 0 && first[i].topics[0] == topic0) count1++;
        }
        assertEq(count1, 1);

        // second call emitted zero (covers the else branch)
        uint256 count2;
        for (uint256 j; j < second.length; j++) {
            if (second[j].topics.length > 0 && second[j].topics[0] == topic0) count2++;
        }
        assertEq(count2, 0);
    }
}


