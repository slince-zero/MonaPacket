// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IMonaPacketNFT
 * @notice The interface for the MonaPacketNFT contract.
 * It defines the functions that the main MonaPacket contract will call.
 */
interface IMonaPacketNFT {
    /**
     * @notice Mints a new NFT to a specified address with a given URI.
     * @param to The recipient of the new NFT.
     * @param uri The metadata URI for the new NFT.
     * @return The ID of the newly created NFT.
     */
    function mint(address to, string memory uri) external returns (uint256);

    /**
     * @notice Pauses all token transfers.
     */
    function pause() external;

    /**
     * @notice Unpauses all token transfers.
     */
    function unpause() external;
}
