// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IMonaPacketNFT
 * @notice The interface for the MonaPacketNFT contract.
 * It defines the functions that the main MonaPacket contract will call.
 */
interface IMonaPacketNFT {
    /**
     * @notice Emitted when a new MonaPacket NFT is minted.
     * @param to The address that received the NFT.
     * @param tokenId The ID of the minted NFT.
     */
    event MonaPacketNFTMinted(address indexed to, uint256 indexed tokenId);

    /**
     * @notice Mints a new NFT to a specified address.
     * @param to The recipient of the new NFT.
     * @return tokenId The ID of the newly created NFT.
     */
    function mint(address to) external returns (uint256);
}
