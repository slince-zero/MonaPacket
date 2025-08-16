// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IMonaPacketNFT
 * @notice The interface for the MonaPacketNFT contract.
 * It defines the functions that the main MonaPacket contract will call.
 */
interface IMonaPacketNFT {
    /**
     * @notice Mints a new NFT to a specified address.
     * @param to The recipient of the new NFT.
     * @return tokenId The ID of the newly created NFT.
     */
    function mint(address to) external returns (uint256);
}
