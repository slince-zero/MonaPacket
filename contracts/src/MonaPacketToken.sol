// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MonaPacketToken is ERC20, ERC20Burnable, Ownable, ERC20FlashMint {
    constructor(
        address initialOwner
    )
        ERC20("MonaPacket Token", "MPKT") // Renamed for branding
        Ownable(initialOwner)
    {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
