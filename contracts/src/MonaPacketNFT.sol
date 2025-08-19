// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Import Ownable
import {IMonaPacketNFT} from "./interface/IMonaPacketNFT.sol"; // Assuming this interface exists

// Inherit from Ownable to manage access control
contract MonaPacketNFT is
    ERC721,
    ERC721URIStorage,
    ERC721Burnable,
    ERC721Pausable,
    Ownable,
    IMonaPacketNFT
{
    uint256 private _nextTokenId;

    // Set the contract name and symbol to match your brand
    constructor() ERC721("MonaPacket", "MPKT") Ownable(msg.sender) {}

    /**
     * @notice Mints a new MonaPacketNFT to the specified address.
     * @dev Only the owner of this contract (the main MonaPacket contract) can call this function.
     * @param to The address to mint the NFT to.
     * @return tokenId The ID of the newly minted NFT.
     */
    function mint(
        address to,
        string memory uri
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    // --- 管理功能 ---

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // --- 重写 OpenZeppelin 的函数以解决冲突 ---
    // The following functions are overrides required by Solidity.

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Pausable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
