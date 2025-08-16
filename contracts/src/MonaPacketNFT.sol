// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Import Ownable
import "./interface/IMonaPacketNFT.sol"; // Assuming this interface exists

// Inherit from Ownable to manage access control
contract MonaPacketNFT is ERC721, Ownable, IMonaPacketNFT {
    uint256 private _nextTokenId;

    // Set the contract name and symbol to match your brand
    constructor() ERC721("MonaPacket", "MPKT") Ownable(msg.sender) {}

    /**
     * @notice Mints a new MonaPacketNFT to the specified address.
     * @dev Only the owner of this contract (the main MonaPacket contract) can call this function.
     * @param to The address to mint the NFT to.
     * @return tokenId The ID of the newly minted NFT.
     */
    function mint(address to) public onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "MonaPacketNFT: Invalid address zero");

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }
}
